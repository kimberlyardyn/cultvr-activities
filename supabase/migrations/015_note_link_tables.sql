-- Many-to-many links from a note (e.g. a saved guided session) to multiple
-- activities and awards. Previously a note carried a single activity_id /
-- award_id FK, and any extra links were only described as text in the note
-- body ("Linked activities: A, B"). These join tables make every link a real,
-- clickable relationship.

create table if not exists public.note_activities (
  note_id uuid not null references public.notes(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (note_id, activity_id)
);

create table if not exists public.note_awards (
  note_id uuid not null references public.notes(id) on delete cascade,
  award_id uuid not null references public.awards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (note_id, award_id)
);

create index if not exists note_activities_note_id_idx on public.note_activities(note_id);
create index if not exists note_activities_activity_id_idx on public.note_activities(activity_id);
create index if not exists note_awards_note_id_idx on public.note_awards(note_id);
create index if not exists note_awards_award_id_idx on public.note_awards(award_id);

alter table public.note_activities enable row level security;
alter table public.note_awards enable row level security;

drop policy if exists "note_activities_all_own" on public.note_activities;
create policy "note_activities_all_own"
on public.note_activities for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "note_awards_all_own" on public.note_awards;
create policy "note_awards_all_own"
on public.note_awards for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Backfill from the existing single-FK columns so current links show as tags.
insert into public.note_activities (note_id, activity_id, user_id)
select id, activity_id, user_id from public.notes
where activity_id is not null
on conflict do nothing;

insert into public.note_awards (note_id, award_id, user_id)
select id, award_id, user_id from public.notes
where award_id is not null
on conflict do nothing;
