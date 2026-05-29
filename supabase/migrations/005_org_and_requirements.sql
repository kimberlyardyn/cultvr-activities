-- Migration: Optional contextual fields
-- - activities.organization_description: describe the organization itself
-- - awards.requirements: criteria / what was needed to earn the award
alter table public.activities
  add column if not exists organization_description text;

alter table public.awards
  add column if not exists requirements text;
