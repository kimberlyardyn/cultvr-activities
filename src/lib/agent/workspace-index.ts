import type { SupabaseClient } from "@supabase/supabase-js";

import { env, hasOpenAIEnv } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";

/**
 * Workspace RAG.
 *
 * - indexWorkspaceForUser: chunks a student's notes, activities, awards,
 *   sessions, goals and colleges, embeds them, and replaces their rows in
 *   workspace_chunks. Run by the background job and after agent writes.
 * - searchWorkspace: vector similarity search (match_workspace_chunks) with a
 *   keyword fallback, so retrieval still works before anything is indexed or
 *   when embeddings are unavailable.
 *
 * Works with either the user-scoped client (RLS) or the service-role client;
 * every query is explicitly scoped to `userId`.
 */

const MAX_CHUNKS = 150;
const MAX_CHUNK_CHARS = 1500;
const STALE_AFTER_HOURS = 12;

type Chunk = {
  source_type: string;
  source_id: string | null;
  title: string;
  content: string;
};

type Row = Record<string, unknown>;

function s(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function joinLines(lines: string[]) {
  return lines.filter(Boolean).join("\n").slice(0, MAX_CHUNK_CHARS);
}

async function rows(
  query: PromiseLike<{ data: Row[] | null; error: unknown }>,
): Promise<Row[]> {
  try {
    const { data, error } = await query;
    return error ? [] : data ?? [];
  } catch {
    return [];
  }
}

export async function buildWorkspaceChunks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Chunk[]> {
  const [notes, activities, awards, sessions, goals, colleges] = await Promise.all([
    rows(supabase.from("notes").select("id,title,body,category").eq("user_id", userId).limit(80)),
    rows(
      supabase
        .from("activities")
        .select("id,name,role,category,position,description,impact,organization_description")
        .eq("user_id", userId)
        .limit(60),
    ),
    rows(
      supabase
        .from("awards")
        .select("id,name,organization,level,scope,description")
        .eq("user_id", userId)
        .limit(40),
    ),
    rows(
      supabase
        .from("guided_sessions")
        .select("id,session_label,focus,summary")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ),
    rows(supabase.from("goals").select("id,title,status,target_date").eq("user_id", userId).limit(40)),
    rows(
      supabase
        .from("college_list")
        .select("id,name,location,status,fit_reason,notes")
        .eq("user_id", userId)
        .limit(30),
    ),
  ]);

  const chunks: Chunk[] = [
    ...notes.map((n) => ({
      source_type: "note",
      source_id: s(n.id) || null,
      title: s(n.title),
      content: joinLines([`Note (${s(n.category) || "note"}): ${s(n.title)}`, s(n.body)]),
    })),
    ...activities.map((a) => ({
      source_type: "activity",
      source_id: s(a.id) || null,
      title: s(a.name),
      content: joinLines([
        `Activity: ${s(a.name)}${s(a.position) || s(a.role) ? ` — ${s(a.position) || s(a.role)}` : ""}${
          s(a.category) ? ` (${s(a.category)})` : ""
        }`,
        s(a.organization_description) && `About: ${s(a.organization_description)}`,
        s(a.description),
        s(a.impact) && `Impact: ${s(a.impact)}`,
      ]),
    })),
    ...awards.map((a) => ({
      source_type: "award",
      source_id: s(a.id) || null,
      title: s(a.name),
      content: joinLines([
        `Award: ${s(a.name)}${s(a.organization) ? ` — ${s(a.organization)}` : ""}${
          s(a.level) || s(a.scope) ? ` (${s(a.level) || s(a.scope)})` : ""
        }`,
        s(a.description),
      ]),
    })),
    ...sessions.map((g) => ({
      source_type: "session",
      source_id: s(g.id) || null,
      title: s(g.session_label),
      content: joinLines([
        `Session: ${s(g.session_label)}${s(g.focus) ? ` — focus: ${s(g.focus)}` : ""}`,
        s(g.summary),
      ]),
    })),
    ...goals.map((g) => ({
      source_type: "goal",
      source_id: s(g.id) || null,
      title: s(g.title),
      content: joinLines([
        `Goal: ${s(g.title)} (${s(g.status) || "active"}${s(g.target_date) ? `, target ${s(g.target_date)}` : ""})`,
      ]),
    })),
    ...colleges.map((c) => ({
      source_type: "college",
      source_id: s(c.id) || null,
      title: s(c.name),
      content: joinLines([
        `College: ${s(c.name)}${s(c.location) ? ` — ${s(c.location)}` : ""} (${s(c.status) || "Dream"})`,
        s(c.fit_reason) && `Fit: ${s(c.fit_reason)}`,
        s(c.notes),
      ]),
    })),
  ];

  return chunks.filter((chunk) => chunk.content.length > 12).slice(0, MAX_CHUNKS);
}

export async function indexWorkspaceForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; chunks: number; detail?: string }> {
  if (!hasOpenAIEnv()) return { ok: false, chunks: 0, detail: "OpenAI not configured." };

  const chunks = await buildWorkspaceChunks(supabase, userId);

  const cleared = await supabase.from("workspace_chunks").delete().eq("user_id", userId);
  if (cleared.error) return { ok: false, chunks: 0, detail: cleared.error.message };
  if (!chunks.length) return { ok: true, chunks: 0 };

  const embedded = await getOpenAI().embeddings.create({
    model: env.openaiEmbeddingModel,
    input: chunks.map((chunk) => chunk.content),
  });

  const { error } = await supabase.from("workspace_chunks").insert(
    chunks.map((chunk, i) => ({
      ...chunk,
      user_id: userId,
      embedding: embedded.data[i]?.embedding ?? null,
    })),
  );
  if (error) return { ok: false, chunks: 0, detail: error.message };
  return { ok: true, chunks: chunks.length };
}

/** True when the student's index is missing or older than STALE_AFTER_HOURS.
 *  Returns false if the table isn't there yet, so callers skip quietly. */
export async function isIndexStale(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("workspace_chunks")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return false;
    const newest = data?.[0]?.created_at as string | undefined;
    if (!newest) return true;
    return Date.now() - new Date(newest).getTime() > STALE_AFTER_HOURS * 3600_000;
  } catch {
    return false;
  }
}

type Hit = { source_type: string; title: string; content: string };

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "what", "about", "from", "have", "my",
  "your", "are", "was", "were", "any", "how", "why", "when", "into", "more", "some",
]);

async function keywordSearch(supabase: SupabaseClient, userId: string, query: string): Promise<Hit[]> {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
    .slice(0, 4);
  if (!terms.length) return [];

  const anyOf = (columns: string[]) =>
    terms.flatMap((term) => columns.map((column) => `${column}.ilike.*${term}*`)).join(",");

  const [notes, activities, awards, sessions] = await Promise.all([
    rows(supabase.from("notes").select("title,body").eq("user_id", userId).or(anyOf(["title", "body"])).limit(5)),
    rows(
      supabase
        .from("activities")
        .select("name,description,impact")
        .eq("user_id", userId)
        .or(anyOf(["name", "description", "impact"]))
        .limit(5),
    ),
    rows(
      supabase.from("awards").select("name,description").eq("user_id", userId).or(anyOf(["name", "description"])).limit(4),
    ),
    rows(
      supabase
        .from("guided_sessions")
        .select("session_label,summary")
        .eq("user_id", userId)
        .or(anyOf(["session_label", "summary"]))
        .limit(4),
    ),
  ]);

  return [
    ...notes.map((n) => ({ source_type: "note", title: s(n.title), content: s(n.body) })),
    ...activities.map((a) => ({
      source_type: "activity",
      title: s(a.name),
      content: [s(a.description), s(a.impact) && `Impact: ${s(a.impact)}`].filter(Boolean).join(" "),
    })),
    ...awards.map((a) => ({ source_type: "award", title: s(a.name), content: s(a.description) })),
    ...sessions.map((g) => ({ source_type: "session", title: s(g.session_label), content: s(g.summary) })),
  ];
}

async function vectorSearch(supabase: SupabaseClient, query: string): Promise<Hit[]> {
  if (!hasOpenAIEnv()) return [];
  try {
    const embedded = await getOpenAI().embeddings.create({
      model: env.openaiEmbeddingModel,
      input: query,
    });
    const { data, error } = await supabase.rpc("match_workspace_chunks", {
      query_embedding: embedded.data[0]?.embedding,
      match_count: 6,
    });
    if (error || !Array.isArray(data)) return [];
    return (data as Array<Row & { similarity?: number }>)
      .filter((row) => (row.similarity ?? 0) > 0.2)
      .map((row) => ({ source_type: s(row.source_type), title: s(row.title), content: s(row.content) }));
  } catch {
    return [];
  }
}

/** Retrieval for the agent's search_workspace tool. Returns model-ready text. */
export async function searchWorkspace(
  supabase: SupabaseClient,
  userId: string,
  query: string,
): Promise<string> {
  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) return "Empty query.";

  let hits = await vectorSearch(supabase, trimmed);
  let mode = "semantic";
  if (!hits.length) {
    hits = await keywordSearch(supabase, userId, trimmed);
    mode = "keyword";
  }
  if (!hits.length) return `No workspace items matched "${trimmed}".`;

  const lines = hits.slice(0, 8).map((hit) => {
    const excerpt = hit.content.replace(/\s+/g, " ").slice(0, 280);
    return `- [${hit.source_type}] ${hit.title || "(untitled)"}: ${excerpt}`;
  });
  return `Workspace results (${mode} search) for "${trimmed}":\n${lines.join("\n")}`;
}
