-- Migration: Allow goals to link to an activity or an award so each entry
-- can have its own forward-looking targets (e.g. "Be elected club president
-- by May 2028"). A goal links to at most one of these — leaving both null
-- preserves the existing standalone-goal behavior.
alter table public.goals
  add column if not exists activity_id uuid references public.activities(id) on delete cascade,
  add column if not exists award_id uuid references public.awards(id) on delete cascade;

create index if not exists goals_activity_id_idx on public.goals(activity_id);
create index if not exists goals_award_id_idx on public.goals(award_id);
