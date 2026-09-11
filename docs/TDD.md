# Credit Count — Technical Design Document

| **Author** | Javier Arias | **Date** | 11 September 2026 |
|---|---|---|---|
| **Version** | 1.1 — as built. Version 1.0 (10 Sep 2026) was approved before any code; everything that changed since is listed in §7. | **Source** | *Credit Count — Statement of Work, Candidate Task*, Koin Limited, July 2026 |
| **Live** | credit-count-borosofo.vercel.app | **Code** | github.com/borosofo/credit-count |

## 1. Summary and design principle

Credit Count is a small multi-user web app where rollercoaster enthusiasts log rides against a shared catalogue and see their **credit count** (unique coasters ridden), total rides and stats, with an **opt-in** public leaderboard. Admins maintain the catalogue; visitors see only the leaderboard and sign-up. One principle drives the design: **the database is the security boundary.** Every privacy and role rule in the SOW is enforced with Postgres Row Level Security (RLS), grants and `security definer` functions, so it holds identically for the app, for direct API calls and for anything built later (FR6, FR8, FR9; AC2, AC4). The Next.js layer adds UX, validation and friendly errors; it is never the only line of defence.

## 2. Architecture

**Browser → Next.js 16 (App Router) on Vercel → Supabase.** React Server Components read data; Server Actions write; `proxy.ts` (Next 16's middleware) refreshes the session cookie and redirects unauthenticated users. Supabase provides Auth (email + password), Postgres with RLS, and the few pieces of server-side logic that need elevated rights (SQL functions). There is no custom API layer and **no service-role key anywhere**: the app uses the publishable (anon) key plus the user's session via `@supabase/ssr`; RLS decides what each request may see.

| Layer | Choice | Reason |
|---|---|---|
| Front + server | Next.js 16.3, React 19, TypeScript, Tailwind v4, shadcn/ui, Zod, next-themes | Required stack; RSC + Server Actions keep the app small; Zod validates every mutation. |
| Data + auth | Supabase Auth, Postgres 17, RLS, SQL functions | Required stack; rules live once, in the database. |
| Hosting | Vercel Hobby (prod = `main`, previews per PR); Supabase Free in `us-east-1`; Vercel functions in `iad1` | Free tiers; app and database in the same region. |
| Tests | Vitest for stats and tiers; `scripts/rls-check.ts` proves RLS through the API (24 checks) | AC2 and AC4 are demonstrated, not assumed. |

## 3. Data model

| Table | Columns and constraints |
|---|---|
| `profiles` | `id uuid` PK = `auth.users.id` · `display_name text` (2–40 chars) · `role text` in (`enthusiast`, `admin`), default `enthusiast` · `show_on_leaderboard bool` default **false** · `created_at`. Created by a trigger on `auth.users` insert, taking `display_name` from sign-up metadata. |
| `coasters` | `id uuid` PK · `name` · `park` · `country` · `manufacturer` · `type text` in (`steel`, `wooden`, `hybrid`) · `rcdb_id int null` (reserved for the future RCDB sync) · `created_at`, `updated_at`. **Unique index on `(lower(name), lower(park))`** blocks duplicates at the source. |
| `rides` | `id uuid` PK · `user_id uuid` → `profiles` (cascade) · `coaster_id uuid` → `coasters` (**restrict**) · `ridden_on date` default today, at most one day ahead (UTC tolerance) · `note text` ≤ 280 · `created_at`. Indexes on `(user_id)`, `(user_id, coaster_id)` and `(coaster_id)`. |

**Credits and stats are derived, never stored.** Credits = `count(distinct coaster_id)` per user; rides = `count(*)`. The dashboard reads the user's rides joined to coasters (a few hundred rows at most) and a pure `computeStats()` function produces credits by country, manufacturer and type, plus the most-ridden coaster; credit tiers (Rookie 1 · Thrill Seeker 5 · Coaster Hunter 10 · Track Legend 25 · Century Club 50) are derived the same way. No denormalised counters can drift, and every Server Action calls `revalidatePath`, so dashboard, history and leaderboard reflect changes immediately (FR3–FR5, FR7).

## 4. Access control

| Object | Visitor (anon) | Enthusiast (authenticated) | Admin |
|---|---|---|---|
| `profiles` | none | SELECT own row; UPDATE own row with a **column grant limited to `display_name`, `show_on_leaderboard`** (`role` is not writable through the API) | same as enthusiast |
| `coasters` | none | SELECT | SELECT + INSERT/UPDATE/DELETE where `(select is_admin())` |
| `rides` | none | ALL where `user_id = auth.uid()` (USING and WITH CHECK) | **no extra policy** — admins cannot read other users' rides (SOW §3) |
| `get_leaderboard()` | EXECUTE | EXECUTE | EXECUTE |
| `merge_coaster(from, into)` | — | raises unless admin | reassigns rides to the surviving coaster, deletes the duplicate |

- `is_admin()` is `security definer`, `stable`, with a fixed `search_path`, reading `profiles.role`: policies never recurse and a role change applies immediately, no JWT refresh. Admin is granted manually by SQL ("no self-serve admin sign-up").
- `get_leaderboard()` is the **only** path by which a visitor touches data. It returns `display_name`, `credits`, `rides` (tie-break) and `is_you` (true only on the caller’s own row, computed from `auth.uid()` inside the function) for profiles with `show_on_leaderboard = true`, ordered by credits; never user ids or coaster ids, so it cannot reveal what anyone has ridden (FR7). The page renders dynamically, so opting out takes effect on the next request.
- Default table privileges for `anon` and `authenticated` are revoked and re-granted only as above; RLS is enabled on all three tables. Supabase's security advisor flags the `security definer` functions as callable; that is the design, and each one checks `auth.uid()` internally.
- Only the publishable key ships to the browser (designed to be public; RLS protects the data). The service-role key is never used: the catalogue is seeded by a SQL migration and every account, demo ones included, is created through normal sign-up.

## 5. Application design

| Route | Access | Content |
|---|---|---|
| `/` | public | Leaderboard: podium for the top three, then ranked rows with a bar relative to the leader; your own row highlighted |
| `/signup`, `/login` | public | Email, password, display name at sign-up |
| `/dashboard` | user | Hero with **credits**, tier and progress to the next tier; total rides; most-ridden coaster; stats by country / manufacturer / type; **Quick log** |
| `/rides` | user | Ride history: edit date and note, delete with confirmation |
| `/coasters` | user | Browse and search the catalogue; "Log ride" on each row; admins also see "Manage catalogue" |
| `/settings` | user | Display name and the leaderboard toggle, with a plain-language note on what becomes public |
| `/admin/coasters` | admin | Add, edit, delete, and "merge into" for duplicates |

**Logging a ride in three interactions (FR2):** the dashboard has an always-visible Quick log card: (1) type in the coaster search box, (2) pick the coaster, (3) press "Log ride"; the date defaults to today and the note is optional. The confirmation says whether the ride added a credit or was another lap. Mobile-first: everything works at 400 px width with no horizontal scroll.

**Look and feel.** Two themes, "Neon Day" and "Neon Night", follow the system preference with a header toggle; a display face for numbers and headings, a readable body face, tier badges, medals and colour-coded coaster types. Added after the first build at the candidate's request, so the app reads as a game about coasters rather than a form; no effect on data or security.

**Sign-up without email confirmation (decision).** The SOW asks for email + password sign-up and leaves richer email flows out of scope. Supabase's built-in email service on the free tier allows only a handful of messages per hour, which would stop reviewers from creating accounts on the spot. Confirmation is therefore **disabled for v1** and recorded as a known trade-off; v2 adds custom SMTP and turns it back on.

## 6. Requirements traceability

| SOW requirement | How the design meets it |
|---|---|
| FR1 visitors see only leaderboard and sign-up | `anon` has no table privileges; only `get_leaderboard()` is executable. |
| FR2 log a ride in ≤ 3 interactions | Quick log card on the dashboard (§5). |
| FR3–FR5 rides vs credits; stats always current | One row per ride; credits = distinct coasters as the headline; derived on read + `revalidatePath`. |
| FR6, FR9 ride history private; edit/delete own rides only | RLS on `rides` with USING and WITH CHECK on `user_id = auth.uid()`; proven by `rls-check.ts`. |
| FR7 leaderboard opt-in, name + credits only, opt-out immediate | `get_leaderboard()` filters on the flag and exposes two fields; dynamic page. |
| FR8 only admins change the catalogue, at the database layer | `is_admin()` policies on `coasters`; proven by `rls-check.ts`. |
| AC1–AC4 | Walked through on the live app on 11 September 2026, both themes, desktop and phone; AC2 and AC4 also by `npm run rls-check` (24/24 against production). |
| AC5, AC6 no secrets; TDD matches the build | `.env*.local` ignored, `.env.example` committed, publishable key only, key grep before submission; this document is the "as built" revision, changes in §7. |

## 7. Assumptions, open questions and changes since v1.0

Questions sent to Koin on 11 September 2026, each with the default applied if unanswered: (1) admin is a flag on a normal account, so admins may also log rides; (2) removing a duplicate that has rides uses **merge**, so nobody loses credits; (3) opted-in users with zero credits appear, ranked by credits, then rides, then name; (4) email confirmation disabled for v1 (§5). Further assumptions: display names are not unique (SOW §9), so two users can share a name and one could imitate another on the leaderboard; v1 accepts this, v2 adds a unique handle. English-only interface. **Deviations from the SOW: none.**

**Changes from v1.0 (design) to v1.1 (as built):** catalogue seeded with 44 coasters across 12 countries and 12 manufacturers (v1.0 said "about 40, ten, nine"). Credit tiers, medals, the two themes and the toggle were added; they are presentation over the same derived data. `ridden_on` accepts at most one day ahead because the database runs in UTC and users do not. A repeatable `scripts/seed-demo.ts` creates the review accounts through the public API. `next-themes` is the one dependency added. The Vercel project defaulted to "Vercel Authentication" on `.vercel.app` URLs, which hid production behind a Vercel login; it now protects preview deployments only.

## 8. Risks and free-tier limits

| Risk / limit | Handling |
|---|---|
| Privacy leak between users (the SOW's most serious defect) | RLS with USING + WITH CHECK, admins without a `rides` policy, leaderboard only through a function, `rls-check.ts` run against production. |
| Catalogue data quality | Unique index on name + park; admin edit and merge; seed reviewed by hand. |
| Supabase Free: project **pauses after 7 days of inactivity**; 500 MB database; 50k MAU; 2 active projects; built-in email ~2 messages/hour | Daily Vercel cron pings the database so the demo stays live; email confirmation off (§5). At real scale the first upgrades are custom SMTP and the Pro plan. |
| Vercel Hobby: non-commercial only; 100 GB bandwidth; 10 s default function timeout; cron once a day; deployment protection on by default | Fine for v1; every page is a handful of small queries; protection limited to previews. |

## 9. Verification, delivery and operations

**Verified before submission:** `tsc`, ESLint and `next build` clean; Vitest (stats and tiers, 9 cases); `rls-check.ts` 24/24 against production (cross-user reads return nothing, cross-user updates and deletes touch zero rows, an enthusiast cannot write to `coasters` or promote themselves, a visitor cannot read `coasters`, `rides` or `profiles`, the leaderboard exposes only rank, name, credits, rides and an is-you flag; opting in and out is reflected immediately); the six acceptance criteria walked through on the live app. **Migrations** are SQL files under `supabase/migrations`, applied in order through the Supabase MCP connector and committed; the seed is idempotent. **Environment:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, set in Vercel and in a local `.env.local`. **Deploy:** GitHub → Vercel Git integration; every push to `main` is production. **Handover:** live Vercel URL, one enthusiast and one admin test account (credentials sent separately, never in the repository), public repository with README, this TDD and `docs/AI_WORKFLOW.md` on how the build was directed with Claude Code.

## 10. Out of scope and next steps

Out of scope per SOW: live RCDB integration, native apps, custom password-reset flows, payments. Suggested v2, in order of value: RCDB sync job using `rcdb_id`; unique handles; custom SMTP with email confirmation; trigram search index and pagination as the catalogue grows; per-park stats and badges; ride photos in Supabase Storage with per-user policies; CSV export; Playwright end-to-end tests; error monitoring.
