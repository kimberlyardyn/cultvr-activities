-- Migration: Add rich activity details + tagged posts (notes)
-- Run this in your Supabase SQL editor.

-- 1. Extend activities table with richer fields
alter table public.activities
  add column if not exists category text,
  add column if not exists position text,
  add column if not exists description text,
  add column if not exists grades text[] not null default '{}'::text[],
  add column if not exists start_date text,
  add column if not exists end_date text,
  add column if not exists in_progress boolean not null default false,
  add column if not exists hours_per_week integer not null default 0,
  add column if not exists weeks_per_year integer not null default 0,
  add column if not exists tags text[] not null default '{}'::text[];

-- 2. Backfill new columns from legacy ones where present
update public.activities
  set position = coalesce(position, role),
      description = coalesce(description, impact)
  where position is null or description is null;

-- 3. Link notes to activities so journal entries can be "tagged posts"
alter table public.notes
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create index if not exists notes_activity_id_idx on public.notes(activity_id);
