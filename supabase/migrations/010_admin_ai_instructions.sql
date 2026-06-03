-- Global AI instructions managed by the administrator from Settings.
-- These rows are injected into every student's AI (chat + voice coach) prompt.

create table if not exists public.admin_ai_instructions (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'text' check (source in ('text', 'document')),
  title text,
  content text not null,
  file_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_ai_instructions enable row level security;

-- Any signed-in user can read the global instructions, because the prompt
-- builder runs under the student's own session when assembling AI context.
drop policy if exists "admin_ai_instructions_read" on public.admin_ai_instructions;
create policy "admin_ai_instructions_read"
on public.admin_ai_instructions for select
to authenticated
using (true);

-- Only the administrator (matched by email) may create/update/delete.
-- Keep this email in sync with the ADMIN_EMAILS environment variable.
drop policy if exists "admin_ai_instructions_admin_write" on public.admin_ai_instructions;
create policy "admin_ai_instructions_admin_write"
on public.admin_ai_instructions for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'savantseal@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'savantseal@gmail.com');
