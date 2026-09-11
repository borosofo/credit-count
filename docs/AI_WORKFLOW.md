# How this build was directed with AI

A short, honest log of how Claude Code was used on Credit Count: what it did, what I decided, and what I corrected. Kept for the review call, updated as the build progresses.

## Ground rules I set

- **SOW → TDD → build, in that order.** The TDD is committed before any application code, and it gets an "as built" revision at the end. The commit history should show that order.
- **The database is the security boundary.** Any AI-generated code that relies on the UI or a Server Action for authorisation is rejected; the rule has to be in RLS or a `security definer` function.
- **No service-role key, anywhere.** Seed via SQL migration; test accounts via the normal sign-up flow.
- **Migrations are read line by line before they are applied.** SQL is the one place a subtle mistake becomes a privacy leak.
- **Prove, don't assume.** A script (`scripts/rls-check.ts`) exercises the API as two different users and as a visitor; it runs against production before submission.
- **Time-box.** The brief says 5–8 hours. Anything that threatens that is cut and written down as a deviation.

## Tooling

Claude Code (Fable 5.1) in VS Code, with the official agent skills installed: `supabase`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `web-design-guidelines`, `shadcn`. The Supabase MCP connector is used to apply migrations, run the security advisor and read logs; `gh` and `vercel` CLIs for repo and deployment.

## Log

### 2026-09-10 — Plan and TDD

- Read the Candidate Task Brief and the SOW with Claude Code and produced an implementation plan first (phases, time budget, risks, questions), not code.
- Decisions I made rather than accepted from the AI:
  - **Supabase cloud free tier instead of a self-hosted instance I already had running.** The AI laid out the trade-offs (demo uptime risk, tooling, the brief's explicit "free tiers are sufficient", the SOW's request to reason about free-tier limits); I chose cloud for this delivery and keep self-hosting as an at-scale talking point.
  - **Email confirmation off for v1**, because Supabase's built-in email is rate-limited on the free tier and reviewers must be able to sign up during the call. Documented in the TDD as a trade-off.
  - Public repository, Outlook plus-address test accounts, neutral shadcn UI, `us-east-1` next to Vercel's `iad1`.
- Sent five clarifying questions to Koin (admin logging rides, merge of duplicates, zero-credit leaderboard entries, email confirmation, repo visibility), each with the default I would apply if unanswered. The brief invites questions; the TDD records the defaults.
- TDD drafted by Claude Code from the plan, then edited down from four pages to three and rendered to PDF from the Markdown source (Edge headless). Committed as the first commit of the repository.

### 2026-09-10 (evening) — Build, before the database existed

- Tooling: installed `gh` and `vercel` CLIs, created the public repo and the Vercel project, scaffolded Next.js 16.3 with `create-next-app`, initialised shadcn/ui (base-nova preset, Base UI primitives).
- Read before writing: the Next.js 16 guides bundled in `node_modules/next/dist/docs` (middleware is now `proxy.ts`; caching model changed), the Supabase changelog (from April 2026 new tables are no longer auto-exposed to the Data API, so the migration grants privileges explicitly), the official `with-supabase` example for the `@supabase/ssr` clients, and the installed shadcn component sources rather than remembered APIs.
- Wrote the three migrations first (schema + RLS + grants, functions, seed) following the Supabase Postgres skill: `auth.uid()` wrapped in `select`, `security definer` only where RLS must be bypassed on purpose, `search_path` pinned, EXECUTE revoked from `public`, indexes on every policy column. Not applied yet: the Supabase project is created in the next session.
- Wrote the pure `computeStats()` with five Vitest cases before any UI used it.
- Corrections made to what the AI produced: `rpc().returns<T[]>()` does not type-check without generated types (cast instead); React 19's lint forbids `setState` inside effects, so success side effects moved into the `useActionState` wrapper; `@types/node` had to move to v24 for Vitest 5; `.env.example` was silently ignored by the scaffold's `.env*` rule and needed a `!.env.example` exception; a one-day tolerance was added to the `ridden_on` check because the database runs in UTC and users do not.
- Verified: `tsc`, `eslint` and `next build` all clean before the commit.

### 2026-09-11 — Database, first deploy, first real findings

- Created the Supabase project through the MCP connector (cost confirmed at 0 USD/month) and applied the three migrations in order, unchanged from the reviewed files. Verified with SQL that the effective grants match the TDD table exactly: `anon` has no table privileges at all, `authenticated` can update only `display_name` and `show_on_leaderboard` on `profiles`, RLS is on for all three tables, 44 coasters seeded across 12 countries.
- Security advisor: four warnings, all "SECURITY DEFINER function is executable" for `get_leaderboard` (anon, authenticated), `is_admin` and `merge_coaster` (authenticated). All intentional and already explained in TDD §4: the leaderboard function is the visitor's only entry point and returns an aggregate; `is_admin` only reports the caller's own role; `merge_coaster` re-checks `is_admin()` inside. Accepted, recorded here rather than silenced.
- Environment variables set on Vercel (production, preview, development) with the publishable key only. GitHub connected; the first push produced a production deployment.
- Two things the AI could not have known without checking against reality:
  - Supabase Auth **rejects `example.com` addresses**, so `rls-check.ts` now creates throwaway users as plus-aliases of a real mailbox (`RLS_CHECK_EMAIL`).
  - The Vercel project came with **Vercel Authentication set to "all except custom domains"**, which sent every visitor of the `.vercel.app` URL to a Vercel login. Changed to "preview deployments only" via the project API; production is public now.
- Email confirmation is still on in the new project (Supabase default); sign-up returns no session until Javier turns it off in the dashboard. `rls-check` and the demo accounts wait on that.

### 2026-09-11 (later) — Verification, demo data, and a deliberate visual pass

- Email confirmation off, Site URL set. `npm run rls-check` against production: 20/20 checks pass. Throwaway users deleted afterwards.
- Demo data through the public API only (`scripts/seed-demo.ts`, credentials from the environment): the two review accounts plus four extra enthusiasts so the leaderboard has a top three and a private user who must never appear. Admin role granted by SQL, as the SOW requires.
- Questions email sent to Koin with the four defaults; all four are what the build implements.
- **Visual pass, my call, not the AI's.** The SOW says the app "should not feel like a prototype"; the first cut was a neutral shadcn skin. I asked for something that feels like a game about coasters. The AI pulled three directions from its design database and mocked them up with the real demo numbers; I picked the dark "Neon Night" and asked for a matching light mode instead of a single theme. What shipped: tokens for both modes with a shared violet-to-rose hero, Russo One for numbers and headings, Chakra Petch for text, a system-default theme toggle, credit tiers (Rookie → Century Club) with a progress bar, medals on the leaderboard, colour-coded type badges, count-up numbers that respect reduced motion, and a toast that distinguishes a new credit from a repeat lap. About three hours, no changes to migrations, policies or action authorisation. Tiers are derived on read like every other stat.
- Caught on the live deployment: a form wrapping the Card content and footer swallowed the Card's gap, so the footer band cut through the password field. Fixed with a one-line class. Headless screenshots on Windows cannot go below roughly 500 px wide, so the phone check is done on a real phone.

### 2026-09-11 (close) — Walkthrough and submission

- After the visual pass I walked the six acceptance criteria myself on the live app, in both themes and on a phone. Two findings, both about discoverability rather than function: as the admin I could not tell where to add, edit or delete a coaster. Row actions were ghost buttons that disappeared on the dark theme and the catalogue page gave no hint that administration existed. Fixed with outlined, iconed actions, a red Delete, and a "Manage catalogue" entry for admins.
- TDD revised to v1.1 "as built": same design, plus the changes listed in its §7 (catalogue size, tiers and themes, the one-day date tolerance, the demo seed script, next-themes, and the Vercel deployment-protection finding). Still three pages.
- What I would tell a colleague about working this way: write the design before the code and commit it, because the AI will happily build first; read the generated SQL line by line, because that is where a mistake becomes a leak; make the AI prove access control through the API instead of trusting the policies it wrote; and check the live deployment, not just the build, because two of the real problems (deployment protection, a placeholder email domain) only existed there.

### Next

Submit: TDD PDF, live URL, the two test accounts, repository link. Book the review call.
