-- Migration: Weekly Challenge feature. Students set 1+ challenges per week
-- from a category list. Each challenge is tied to a Monday-start week.
create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  category text,
  description text,
  week_start_date date not null,
  status text not null default 'active',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_challenges_user_id_idx on public.weekly_challenges(user_id);
create index if not exists weekly_challenges_week_idx
  on public.weekly_challenges(user_id, week_start_date desc);

alter table public.weekly_challenges enable row level security;

drop policy if exists "weekly_challenges_all_own" on public.weekly_challenges;
create policy "weekly_challenges_all_own"
  on public.weekly_challenges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
