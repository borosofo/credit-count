<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Credit Count — working agreement for AI agents

Read `docs/TDD.md` first. It is the approved design; the build follows it, and any deviation is written into its §7 before or right after the code changes. `docs/AI_WORKFLOW.md` is the log of how the work was directed; append to it when something notable happens (a decision, a correction, a cut).

## Non-negotiables

1. **The database is the security boundary.** Privacy and role rules live in `supabase/migrations/*` as RLS policies, grants and `security definer` functions. Server Actions validate input and give friendly errors; they are never the only thing enforcing a rule.
2. **No service-role key anywhere.** Not in code, not in `.env*`, not in Vercel. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. **Credits and stats are derived**, never stored. Credits = distinct coasters ridden; rides = rows.
4. **Migrations are SQL files** in `supabase/migrations/`, timestamp-prefixed, applied in order, committed. Read every migration line by line before applying it.
5. **Keep it small.** The brief is 5–8 hours. Prefer the boring, standard solution. No new dependencies without a reason written in the commit message.

## Stack conventions

- Next.js 16 App Router, `src/` directory, TypeScript strict. Route protection in `src/proxy.ts` plus a server-side check in every protected page and action. Read `node_modules/next/dist/docs/` before using an API you are not sure about (16 renamed middleware to proxy and changed caching).
- Supabase via `@supabase/ssr`: browser client in Client Components, server client (cookies) in Server Components, Server Actions and Route Handlers. Verify identity on the server with `getClaims()`; never trust client-supplied user ids.
- Mutations are Server Actions in `src/app/**/actions.ts`, validated with Zod, followed by `revalidatePath`.
- UI: shadcn/ui (base-nova, Base UI primitives, lucide icons) and Tailwind v4. Follow the shadcn skill rules: `Field`/`FieldGroup` for forms, semantic colour tokens, `gap-*` not `space-*`, every Dialog has a title. Mobile first; everything must work at 400 px.
- Stats logic in `src/lib/stats.ts` is pure and unit-tested with Vitest. `scripts/rls-check.ts` proves the RLS rules through the API.
- Commits: conventional prefixes (`feat`, `fix`, `chore`, `docs`, `test`), imperative subject, body says why.
