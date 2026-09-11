# Credit Count

A credit tracker for rollercoaster enthusiasts. Sign up, log rides against a shared catalogue, watch your **credit count** (unique coasters ridden) and stats grow, and opt in to a public leaderboard if you want to. Built for the Koin Limited AI Product Engineer candidate task from a fictional Statement of Work.

- **Design:** [docs/TDD.md](docs/TDD.md) (also as [PDF](docs/TDD.pdf)) — the Technical Design Document the build follows.
- **How it was built with AI:** [docs/AI_WORKFLOW.md](docs/AI_WORKFLOW.md).
- **Working agreement for agents:** [AGENTS.md](AGENTS.md).

## Stack

Next.js 16 (App Router, Server Components, Server Actions) on Vercel · Supabase (Auth, Postgres, Row Level Security, SQL functions) · TypeScript · Tailwind v4 + shadcn/ui · Zod · Vitest.

The one design principle: **the database is the security boundary.** Every privacy and role rule lives in `supabase/migrations/` as RLS policies, grants and `security definer` functions, so it holds for the app, for direct API calls and for anything built later. The Next.js layer adds validation and friendly errors, never the only line of defence. No service-role key is used anywhere.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the project URL and publishable key
npm run dev                  # http://localhost:3000
```

The database schema, policies, functions and the catalogue seed are the SQL files in `supabase/migrations/`, applied in order to a Supabase project (via the Supabase MCP connector, the CLI, or the SQL editor). In Supabase Auth, email confirmation is turned **off** for v1 (see TDD §5 for why).

Admin access is granted manually, as the SOW requires:

```sql
update public.profiles set role = 'admin' where id = '<auth user id>';
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Next.js as usual |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | Vitest: the pure `computeStats()` behind the dashboard |
| `npm run rls-check` | Signs up two throwaway users with the publishable key and proves, through the API, that nobody can read or change another user's rides, that enthusiasts cannot touch the catalogue, and that a visitor can read only the leaderboard (AC2, AC4). 24 checks; passing against production. |
| `npm run seed-demo` | Creates the review accounts and their rides through the normal sign-up flow (credentials from the environment, see the script header). Re-runnable. |

## Project map

```
supabase/migrations/   schema + RLS + grants · functions (get_leaderboard, merge_coaster) · seed
src/proxy.ts           session refresh and optimistic redirects (Next 16 middleware)
src/lib/supabase/      browser, server and proxy clients (@supabase/ssr)
src/lib/auth.ts        getClaims()-based identity, requireUser(), requireAdmin()
src/lib/stats.ts       computeStats(): credits, rides, by country/manufacturer/type, most ridden
src/app/               / leaderboard · /login /signup · /dashboard · /rides · /coasters · /settings · /admin/coasters · /api/keepalive
scripts/rls-check.ts   the access-control proof described above
```

## Acceptance criteria (SOW §8)

Walked through on the deployed app on 11 September 2026, in both themes, on desktop and on a phone.

| # | Criterion | How it was checked |
|---|---|---|
| AC1 | New user signs up, logs rides on three coasters including one repeat, sees credits, rides and stats update | Fresh account through the UI; three coasters, one twice: credits 3, rides 4, stats by country, manufacturer and type and most-ridden updated without a manual refresh. |
| AC2 | A second user cannot view, edit or delete the first user's rides, in the UI or by direct API calls | UI: a second account sees only its own history. API: `npm run rls-check`, 24/24 (cross-user select returns nothing; update and delete touch zero rows; inserting on someone else's behalf is refused). |
| AC3 | Leaderboard visible signed out, only opted-in users, display name and credit count only | Signed-out visit shows the opted-in accounts only; the private demo user never appears; the RPC exposes rank, display name, credits, rides and an is-you flag (true only for the caller), nothing else. |
| AC4 | Enthusiast cannot add, edit or delete catalogue entries by any means; admin can | UI: no admin entry points for enthusiasts and `/admin/coasters` redirects them. API: `rls-check` (insert refused, update and delete affect zero rows, `merge_coaster` refused). Admin account adds, edits, merges and deletes. |
| AC5 | No secrets in client code or the repository | Only the publishable key is used; it lives in `.env.local` (ignored) and Vercel. `git grep` for `service_role`, `sb_secret`, JWTs and the demo passwords returns nothing in tracked files. |
| AC6 | TDD describes what was built; deviations flagged | `docs/TDD.md` v1.2 "as built", §8 lists every change from the approved v1.0. No deviation from the SOW. |

## Design notes

Two themes, "Neon Day" and "Neon Night", follow the system preference with a toggle in the header. A podium for the top three and ranked bars for the rest; park icons and an SVG track motif, all vector. Credit tiers (Rookie 1 · Thrill Seeker 5 · Coaster Hunter 10 · Track Legend 25 · Century Club 50), leaderboard medals and colour-coded coaster types are presentation over the same derived data; nothing about them is stored.
