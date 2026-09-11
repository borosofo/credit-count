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
| `npm run rls-check` | Signs up two throwaway users with the publishable key and proves, through the API, that nobody can read or change another user's rides, that enthusiasts cannot touch the catalogue, and that a visitor can read only the leaderboard (AC2, AC4) |

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

To be recorded here after the deployed app is walked through: sign-up and rides on three coasters with one repeat (AC1); cross-user isolation through the UI and `npm run rls-check` (AC2); leaderboard as a signed-out visitor (AC3); enthusiast vs admin on the catalogue (AC4); no secrets in client code or repository (AC5); TDD matches what shipped (AC6).
