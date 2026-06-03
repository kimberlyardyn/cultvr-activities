-- Reshape the student profile captured in Settings.
-- Add: date of birth, user identity, location, single current priority.
-- Remove: application stage, intended majors, interests, current priorities,
--         target colleges, important deadlines.

alter table public.student_admissions_profiles
  add column if not exists date_of_birth date,
  add column if not exists user_identity text,
  add column if not exists location text,
  add column if not exists current_priority text;

alter table public.student_admissions_profiles
  drop column if exists application_stage,
  drop column if exists intended_majors,
  drop column if exists interests,
  drop column if exists current_priorities,
  drop column if exists target_colleges,
  drop column if exists important_deadlines;
