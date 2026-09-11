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

### Next

Create the Supabase project (needs the new organisation), apply the migrations with the MCP connector, run the security advisor, turn off email confirmation, set env vars on Vercel, connect GitHub for auto-deploys, then test end to end and write `scripts/rls-check.ts`.
