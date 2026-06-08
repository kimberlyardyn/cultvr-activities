-- Migration 014: Résumé education, skills, and interests.
--
-- Extends the résumé header (resume_profiles, one row per user) with:
--   * education — multiple schools, stored as a JSON array so the whole settings
--     form still saves in a single upsert (no per-row table/RLS needed). Each
--     entry: { school, degree, location, graduation, gpa, details }.
--   * skills / interests — free-text sections shown at the bottom of an export.

alter table public.resume_profiles
  add column if not exists education jsonb not null default '[]'::jsonb;

alter table public.resume_profiles
  add column if not exists skills text;

alter table public.resume_profiles
  add column if not exists interests text;
