-- Migration: Add reordering support to activities; richer awards
-- Run this in your Supabase SQL editor.

alter table public.activities
  add column if not exists sort_order integer not null default 0;

alter table public.awards
  add column if not exists organization text,
  add column if not exists description text,
  add column if not exists level text,
  add column if not exists activity_id uuid references public.activities(id) on delete set null,
  add column if not exists sort_order integer not null default 0;

create index if not exists awards_activity_id_idx on public.awards(activity_id);
