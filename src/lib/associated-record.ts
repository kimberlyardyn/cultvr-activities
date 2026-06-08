/**
 * Helpers for the "associated work" that hangs off an activity or award —
 * its goals/targets, tagged notes/reflections, and the brainstorm (guided)
 * sessions that produced them. Used by the editor's read-only "Brainstorm
 * sessions & notes" section and by the "Full record" export.
 *
 * Linkage notes:
 * - Notes link directly via `activity_id` / `award_id`.
 * - Goals link directly via `activity_id` / `award_id`.
 * - Guided sessions have NO direct activity/award column — they link
 *   indirectly through the note or goal they created (`note_id` / `goal_id`).
 */
import type { Activity, Award, Goal, GuidedSession, Note } from "@/lib/types";

export type AssociatedWork = {
  notes: Note[];
  sessions: GuidedSession[];
};

export function collectAssociatedWork(params: {
  kind: "activity" | "award";
  id: string;
  notes: Note[];
  goals: Goal[];
  sessions: GuidedSession[];
}): AssociatedWork {
  const { kind, id, notes, goals, sessions } = params;

  const linkedNotes = notes.filter((n) =>
    kind === "activity" ? n.activity_id === id : n.award_id === id,
  );
  const noteIds = new Set(linkedNotes.map((n) => n.id));
  const goalIds = new Set(
    goals
      .filter((g) => (kind === "activity" ? g.activity_id === id : g.award_id === id))
      .map((g) => g.id),
  );

  const linkedSessions = sessions.filter(
    (s) =>
      (s.note_id != null && noteIds.has(s.note_id)) ||
      (s.goal_id != null && goalIds.has(s.goal_id)),
  );

  return { notes: linkedNotes, sessions: linkedSessions };
}

/** "2026-05-01" → "May 2026"; falls back to the raw value when unparseable. */
function formatMonthYear(isoDate: string | null): string {
  if (!isoDate) return "";
  const [y, m] = isoDate.split("-");
  if (!y || !m) return isoDate;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** "2026-05-12T…" → "May 12, 2026". */
function formatDay(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function goalsBlock(goals: Goal[]): string[] {
  if (!goals.length) return [];
  const lines = [`GOALS & TARGETS (${goals.length})`];
  for (const g of goals) {
    const target = g.target_date ? ` [Target: ${formatMonthYear(g.target_date)}]` : "";
    const status = g.status === "achieved" ? " — achieved" : "";
    lines.push(`- ${g.title}${target}${status}`);
  }
  return lines;
}

function sessionsBlock(sessions: GuidedSession[]): string[] {
  if (!sessions.length) return [];
  const lines = [`BRAINSTORM SESSIONS (${sessions.length})`];
  for (const s of sessions) {
    const when = formatDay(s.completed_at ?? s.created_at);
    lines.push(`- ${s.session_label}${when ? ` — ${when}` : ""}`);
    if (s.focus) lines.push(`  Focus: ${s.focus}`);
    if (s.summary) lines.push(`  Summary: ${s.summary}`);
  }
  return lines;
}

function notesBlock(notes: Note[]): string[] {
  if (!notes.length) return [];
  const lines = [`NOTES & REFLECTIONS (${notes.length})`];
  for (const n of notes) {
    const when = formatDay(n.created_at);
    lines.push(`- ${n.title}${when ? ` — ${when}` : ""}`);
    if (n.body) lines.push(`  ${n.body}`);
  }
  return lines;
}

/** A blank line between non-empty blocks, joined into one document string. */
function joinBlocks(blocks: string[][]): string {
  return blocks
    .filter((b) => b.length)
    .map((b) => b.join("\n"))
    .join("\n\n");
}

export function buildActivityRecordText(
  a: Activity,
  goals: Goal[],
  work: AssociatedWork,
): string {
  const header: string[] = [`ACTIVITY: ${a.name || "Untitled activity"}`];
  const subtitle = [a.position || a.role, a.category].filter(Boolean).join(" · ");
  if (subtitle) header.push(subtitle);
  const end = a.in_progress ? "Present" : a.end_date || "";
  if (a.start_date || end) header.push(`Dates: ${a.start_date || "—"} → ${end || "—"}`);
  if (a.grades.length) header.push(`Grades: ${a.grades.join(", ")}`);
  if (a.hours_per_week || a.weeks_per_year)
    header.push(`Time: ${a.hours_per_week}h/wk · ${a.weeks_per_year}wks/yr`);

  const about = a.organization_description
    ? ["ABOUT THE ORGANIZATION", a.organization_description]
    : [];
  const description = a.description || a.impact
    ? ["DESCRIPTION", (a.description ?? a.impact) as string]
    : [];

  return joinBlocks([
    header,
    about,
    description,
    goalsBlock(goals),
    sessionsBlock(work.sessions),
    notesBlock(work.notes),
  ]);
}

export function buildAwardRecordText(
  a: Award,
  goals: Goal[],
  work: AssociatedWork,
): string {
  const header: string[] = [`AWARD: ${a.name || "Untitled award"}`];
  const subtitle = [a.organization, a.year].filter(Boolean).join(" · ");
  if (subtitle) header.push(subtitle);
  if (a.level) header.push(`Level: ${a.level}`);
  if (a.scope) header.push(`Scope: ${a.scope}`);

  const description = a.description ? ["DESCRIPTION", a.description] : [];
  const requirements = a.requirements ? ["REQUIREMENTS", a.requirements] : [];

  return joinBlocks([
    header,
    description,
    requirements,
    goalsBlock(goals),
    sessionsBlock(work.sessions),
    notesBlock(work.notes),
  ]);
}
