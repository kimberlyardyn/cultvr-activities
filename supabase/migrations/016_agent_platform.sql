-- Agent platform: execution log, proactive insights, and workspace RAG chunks.

-- Execution log: every action the agent proposed that the student approved
-- (executed / failed) or dismissed.
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  reason text,
  status text not null default 'executed'
    check (status in ('executed', 'failed', 'dismissed')),
  result text,
  created_at timestamptz not null default now()
);

create index if not exists agent_actions_user_created_idx
on public.agent_actions (user_id, created_at desc);

-- Proactive insights written by the background job (and refreshed on demand).
create table if not exists public.agent_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  kind text not null,
  title text not null,
  detail text,
  prompt text,
  status text not null default 'new'
    check (status in ('new', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists agent_insights_user_created_idx
on public.agent_insights (user_id, created_at desc);

-- Workspace RAG: embedded chunks of the student's notes, activities, awards,
-- sessions, goals and colleges. Embedding size matches text-embedding-3-small.
create extension if not exists vector with schema extensions;

create table if not exists public.workspace_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  source_type text not null,
  source_id uuid,
  title text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists workspace_chunks_user_idx
on public.workspace_chunks (user_id, created_at desc);

create index if not exists workspace_chunks_embedding_idx
on public.workspace_chunks using hnsw (embedding vector_cosine_ops);

-- Similarity search scoped to the calling student (security invoker + RLS).
create or replace function public.match_workspace_chunks(
  query_embedding vector(1536),
  match_count int default 6
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  title text,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.source_type,
    c.source_id,
    c.title,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.workspace_chunks c
  where c.user_id = auth.uid()
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

alter table public.agent_actions enable row level security;
alter table public.agent_insights enable row level security;
alter table public.workspace_chunks enable row level security;

drop policy if exists "agent_actions_all_own" on public.agent_actions;
create policy "agent_actions_all_own"
on public.agent_actions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "agent_insights_all_own" on public.agent_insights;
create policy "agent_insights_all_own"
on public.agent_insights for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "workspace_chunks_all_own" on public.workspace_chunks;
create policy "workspace_chunks_all_own"
on public.workspace_chunks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
