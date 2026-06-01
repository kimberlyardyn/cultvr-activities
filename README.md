# Cultvr Story

Cultvr Story is a lightweight college counseling workspace for high school
students, focused on helping them develop and tell their personal narrative.
It is a separate deployment cloned from the Cultvr MVP (`cultvr-activities`)
and runs on its own GitHub repo, Vercel project, and Supabase project.

This app includes:

- Landing page
- Supabase email/password and magic-link auth
- Protected dashboard
- Notes, goals, tasks, activities, and document upload
- OpenAI chat counseling endpoint
- OpenAI Realtime voice session endpoint with ephemeral client secrets

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create environment variables:

```bash
cp .env.example .env.local
```

3. Fill in at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

4. In Supabase, open the SQL editor and run:

```text
supabase/schema.sql
```

5. Start the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Required Services

### Supabase

Create a Supabase project and copy:

- Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
- Project publishable key -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Service role key -> `SUPABASE_SERVICE_ROLE_KEY`
- Postgres connection string -> `DATABASE_URL`

Then run `supabase/schema.sql`.

In Supabase Auth, add redirect URLs:

```text
http://localhost:3000/auth/callback
https://YOUR_DOMAIN/auth/callback
```

### OpenAI

Create an OpenAI API key and set:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REALTIME_MODEL=gpt-realtime
```

The chat route uses the Responses API. The voice route uses Realtime client
secrets and WebRTC so the browser never receives the standard API key.

### Vercel

Create or link a Vercel project, then add all production environment variables
in Project Settings -> Environment Variables.

Required for deploy automation:

```bash
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

## Deployment Checklist

1. Push the repo to GitHub.
2. Create a Supabase project.
3. Run `supabase/schema.sql`.
4. Create an OpenAI API key.
5. Create a Vercel project from the repo.
6. Add Vercel env vars for Production and Preview.
7. Add Supabase Auth redirect URLs for Vercel preview and production domains.
8. Deploy.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm build
```

## Notes

This MVP intentionally keeps records student-owned with Row Level Security.
Future versions should add counselor/parent organizations, consent controls,
audit logs, retention settings, and moderation/safety review for minors.
