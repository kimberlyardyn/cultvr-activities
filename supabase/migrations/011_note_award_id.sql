-- Migration 009: Let notes link to an award the way they already link to an
-- activity. The Guided Sessions "Save session" form lets a user attach the
-- session to an existing activity or award; until now the award link only lived
-- in the note body text. This adds the proper FK so the link is queryable.

alter table public.notes
  add column if not exists award_id uuid references public.awards(id) on delete set null;

create index if not exists notes_award_id_idx on public.notes(award_id);
