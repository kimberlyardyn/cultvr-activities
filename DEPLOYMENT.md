# Cultvr Deployment Guide

## What I Need From You

### 1. Supabase

Create a Supabase project and send these values:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
```

Also confirm the production domain so I can add the right Supabase Auth redirect
URL:

```text
https://YOUR_DOMAIN/auth/callback
```

### 2. OpenAI

Create an API key with access to Responses API and Realtime API:

```text
OPENAI_API_KEY
```

Optional overrides:

```text
OPENAI_MODEL
OPENAI_REALTIME_MODEL
```

Defaults in the app:

```text
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REALTIME_MODEL=gpt-realtime
```

### 3. Vercel

For me to deploy from here without interrupting you:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

If the Vercel project does not exist yet, I need either:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
```

or you can connect the GitHub repo manually in Vercel and give me the resulting
project id.

### 4. Email

Supabase Auth can send basic auth emails, but production should use custom SMTP.
For Resend:

```text
RESEND_API_KEY
```

If using another provider, send the SMTP host, port, username, and password.

### 5. Optional Observability

```text
SENTRY_DSN
SENTRY_AUTH_TOKEN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
```

## Step-by-Step Deploy

1. Create the Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Create the OpenAI API key.
4. Create the Vercel project from this repo.
5. Add all environment variables in Vercel for Production and Preview.
6. Add auth redirect URLs in Supabase:

```text
http://localhost:3000/auth/callback
https://YOUR_VERCEL_DOMAIN/auth/callback
https://YOUR_CUSTOM_DOMAIN/auth/callback
```

7. Deploy from Vercel.
8. Create a test account and verify:

- Sign up
- Email confirmation or magic link
- Dashboard opens
- Note/goal/task/activity creation
- Document upload
- Chat response
- Voice session connection

## DNS

If using a custom domain, I need access to the DNS provider or these records:

```text
CNAME www -> cname.vercel-dns.com
A apex -> Vercel-provided apex record
```

Vercel will show the exact DNS target after the domain is added.
