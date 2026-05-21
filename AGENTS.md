# Agent Notes

This project uses Next.js App Router, TypeScript, Tailwind CSS, Supabase, and
OpenAI.

## Conventions

- Keep auth and persistence server-side unless a client-side Supabase browser
  client is required.
- Put Supabase server clients in `src/lib/supabase/server.ts`.
- Put browser clients in `src/lib/supabase/client.ts`.
- Keep database changes in `supabase/schema.sql`.
- Use server actions for simple dashboard mutations.
- Use API routes for OpenAI calls so API keys never reach the browser.
- Keep UI practical and workflow-first. This is a counseling workspace, not a
  marketing site.

## Checks

Run before handing off changes:

```bash
pnpm lint
pnpm build
```
