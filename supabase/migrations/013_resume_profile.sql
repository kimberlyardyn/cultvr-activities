-- Migration 013: Resume header / contact details.
--
-- Personal info used to build a proper resume header on export. Kept in its own
-- table (one row per user) so it's independent of the admissions profile.

create table if not exists public.resume_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text,
  email text,
  phone text,
  location text,
  links text,        -- free text, e.g. "linkedin.com/in/jane · github.com/jane"
  summary text,      -- optional 1–2 line résumé summary / objective
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resume_profiles enable row level security;

drop policy if exists "resume_profiles_all_own" on public.resume_profiles;
create policy "resume_profiles_all_own"
  on public.resume_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
