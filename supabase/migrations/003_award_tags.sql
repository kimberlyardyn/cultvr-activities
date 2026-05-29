-- Migration: Tags array for awards (mirrors activities.tags).
alter table public.awards
  add column if not exists tags text[] not null default '{}'::text[];
