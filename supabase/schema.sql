create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  student_year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  body text not null,
  category text not null default 'Reflection',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  status text not null default 'active',
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  status text not null default 'todo',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  role text,
  years text,
  impact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.documents enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "notes_all_own" on public.notes;
create policy "notes_all_own"
on public.notes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "goals_all_own" on public.goals;
create policy "goals_all_own"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_all_own" on public.tasks;
create policy "tasks_all_own"
on public.tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "activities_all_own" on public.activities;
create policy "activities_all_own"
on public.activities for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own"
on public.documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('student_uploads', 'student_uploads', false)
on conflict (id) do nothing;

drop policy if exists "student_uploads_select_own" on storage.objects;
create policy "student_uploads_select_own"
on storage.objects for select
using (
  bucket_id = 'student_uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_uploads_insert_own" on storage.objects;
create policy "student_uploads_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'student_uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_uploads_delete_own" on storage.objects;
create policy "student_uploads_delete_own"
on storage.objects for delete
using (
  bucket_id = 'student_uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
