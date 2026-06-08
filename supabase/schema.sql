create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  student_year text,
  nav_layout text not null default 'left'
    check (nav_layout in ('left', 'top')),
  nav_collapsed boolean not null default false,
  top_nav_collapsed boolean not null default false,
  appearance text not null default 'paper'
    check (appearance in ('paper', 'dark')),
  font_family text not null default 'serif'
    check (font_family in ('serif', 'sans')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text;

alter table public.profiles
  add column if not exists nav_layout text not null default 'left';

alter table public.profiles
  add column if not exists nav_collapsed boolean not null default false;

alter table public.profiles
  add column if not exists top_nav_collapsed boolean not null default false;

alter table public.profiles
  add column if not exists appearance text not null default 'paper';

alter table public.profiles
  add column if not exists font_family text not null default 'serif';

create table if not exists public.student_admissions_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  date_of_birth date,
  user_identity text,
  location text,
  grade_level text,
  current_priority text,
  coaching_style text not null default 'encouraging'
    check (coaching_style in ('direct', 'encouraging', 'structured', 'exploratory')),
  personality_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  body text not null,
  category text not null default 'Reflection',
  activity_id uuid references public.activities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create index if not exists notes_activity_id_idx on public.notes(activity_id);

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
  category text,
  position text,
  description text,
  grades text[] not null default '{}'::text[],
  start_date text,
  end_date text,
  in_progress boolean not null default false,
  hours_per_week integer not null default 0,
  weeks_per_year integer not null default 0,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  scope text,
  year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.college_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  location text,
  fit_reason text,
  status text not null default 'Dream'
    check (status in ('Dream', 'Reach', 'Match', 'Necessity', 'Getting Close', 'Actualized', 'Set Aside For Now')),
  priority text not null default 'Medium'
    check (priority in ('High', 'Medium', 'Low')),
  notes text,
  source text not null default 'manual'
    check (source in ('manual', 'conversation', 'imported')),
  last_mentioned_at timestamptz,
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

create table if not exists public.admin_ai_instructions (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'text' check (source in ('text', 'document')),
  title text,
  content text not null,
  file_name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  full_name text,
  email text,
  phone text,
  location text,
  links text,
  summary text,
  education jsonb not null default '[]'::jsonb,  -- array of { school, degree, location, graduation, gpa, details }
  skills text,
  interests text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  user_email text,
  category text not null default 'question'
    check (category in ('question', 'bug', 'feedback', 'other')),
  message text not null,
  attachment_paths text[] not null default '{}'::text[],
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.guided_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  session_type text not null,
  session_label text not null,
  focus text,
  interaction_mode text not null default 'voice'
    check (interaction_mode in ('voice', 'chat', 'mixed')),
  status text not null default 'completed'
    check (status in ('active', 'reviewed', 'completed', 'abandoned')),
  transcript text,
  summary text,
  prompt_count integer not null default 0,
  answered_count integer not null default 0,
  note_id uuid references public.notes(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guided_session_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.guided_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  prompt_index integer not null,
  prompt text not null,
  answer text,
  source text not null default 'chat'
    check (source in ('voice', 'chat', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, prompt_index)
);

create table if not exists public.guided_session_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.guided_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role text not null check (role in ('student', 'assistant', 'system')),
  modality text not null check (modality in ('voice', 'chat')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.student_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  memory_type text not null
    check (
      memory_type in (
        'theme',
        'strength',
        'gap',
        'activity_evidence',
        'essay_seed',
        'college_fit',
        'next_prompt',
        'coaching_preference'
      )
    ),
  label text not null,
  summary text not null,
  confidence numeric not null default 0.6
    check (confidence >= 0 and confidence <= 1),
  source_session_id uuid references public.guided_sessions(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'archived', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guided_sessions_user_created_idx
on public.guided_sessions (user_id, created_at desc);

create index if not exists guided_session_answers_session_idx
on public.guided_session_answers (session_id, prompt_index);

create index if not exists guided_session_turns_session_idx
on public.guided_session_turns (session_id, occurred_at);

create index if not exists college_list_user_updated_idx
on public.college_list (user_id, updated_at desc);

create index if not exists student_memories_user_created_idx
on public.student_memories (user_id, created_at desc);

create index if not exists student_memories_user_type_idx
on public.student_memories (user_id, memory_type, status);

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
alter table public.student_admissions_profiles enable row level security;
alter table public.student_memories enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.awards enable row level security;
alter table public.college_list enable row level security;
alter table public.documents enable row level security;
alter table public.admin_ai_instructions enable row level security;
alter table public.resume_profiles enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.guided_sessions enable row level security;
alter table public.guided_session_answers enable row level security;
alter table public.guided_session_turns enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "student_admissions_profiles_all_own" on public.student_admissions_profiles;
create policy "student_admissions_profiles_all_own"
on public.student_admissions_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "student_memories_all_own" on public.student_memories;
create policy "student_memories_all_own"
on public.student_memories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "resume_profiles_all_own" on public.resume_profiles;
create policy "resume_profiles_all_own"
on public.resume_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "feedback_insert_own" on public.feedback_messages;
create policy "feedback_insert_own"
on public.feedback_messages for insert
with check (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback_messages;
create policy "feedback_select_own"
on public.feedback_messages for select
using (auth.uid() = user_id);

drop policy if exists "admin_ai_instructions_read" on public.admin_ai_instructions;
create policy "admin_ai_instructions_read"
on public.admin_ai_instructions for select
to authenticated
using (true);

drop policy if exists "admin_ai_instructions_admin_write" on public.admin_ai_instructions;
create policy "admin_ai_instructions_admin_write"
on public.admin_ai_instructions for all
to authenticated
using (lower(auth.jwt() ->> 'email') = 'savantseal@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'savantseal@gmail.com');

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

drop policy if exists "awards_all_own" on public.awards;
create policy "awards_all_own"
on public.awards for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "college_list_all_own" on public.college_list;
create policy "college_list_all_own"
on public.college_list for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "documents_all_own" on public.documents;
create policy "documents_all_own"
on public.documents for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "guided_sessions_all_own" on public.guided_sessions;
create policy "guided_sessions_all_own"
on public.guided_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "guided_session_answers_all_own" on public.guided_session_answers;
create policy "guided_session_answers_all_own"
on public.guided_session_answers for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.guided_sessions
    where guided_sessions.id = guided_session_answers.session_id
      and guided_sessions.user_id = auth.uid()
  )
);

drop policy if exists "guided_session_turns_all_own" on public.guided_session_turns;
create policy "guided_session_turns_all_own"
on public.guided_session_turns for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.guided_sessions
    where guided_sessions.id = guided_session_turns.session_id
      and guided_sessions.user_id = auth.uid()
  )
);

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
