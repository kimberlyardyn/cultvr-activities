-- Migration 012: User feedback / contact-admin messages.
--
-- Lets students send questions or bug reports to the admin from Settings,
-- optionally with attachment paths (screenshots / PDFs) stored in the existing
-- `student_uploads` storage bucket.

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  user_email text,
  category text not null default 'question'
    check (category in ('question', 'bug', 'feedback', 'other')),
  message text not null,
  -- Storage paths (in the student_uploads bucket) for any attached files.
  attachment_paths text[] not null default '{}'::text[],
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_messages_created_idx
  on public.feedback_messages (created_at desc);

alter table public.feedback_messages enable row level security;

-- Users can insert their own feedback and read back what they submitted.
drop policy if exists "feedback_insert_own" on public.feedback_messages;
create policy "feedback_insert_own"
  on public.feedback_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "feedback_select_own" on public.feedback_messages;
create policy "feedback_select_own"
  on public.feedback_messages for select
  using (auth.uid() = user_id);
