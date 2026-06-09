/**
 * Shared helpers for the activity/award voice coaches: the per-session opening
 * directive (pinned first line + edit-mode behavior) and a deterministic goal
 * backstop that detects goals from the student's own transcript so a clearly
 * stated goal always lands even if the model never calls `update_fields`.
 *
 * Pure functions only — safe to import into client components.
 */

export type GoalCandidate = { title: string; target_date?: string };

/**
 * Builds the per-session opening directive. The coach's very first spoken line
 * is pinned verbatim so it can't drift into filler ("Sounds great!"). In ADD
 * mode it asks what to add; in EDIT mode it names the entry and asks what to
 * change, and tells the coach not to re-run the full intake on something that's
 * already filled in.
 */
export function buildVoiceModeInstructions(
  entity: "activity" | "award",
  mode: "add" | "edit",
  name?: string,
): string {
  const trimmed = (name ?? "").trim();
  const opening =
    mode === "edit"
      ? trimmed
        ? `What would you like to edit or adjust related to ${trimmed}?`
        : `What would you like to edit or adjust about this ${entity}?`
      : `Let's get started. What ${entity} would you like to add today?`;

  const openingDirective = `Your VERY FIRST line must be spoken exactly, word for word, with nothing before it — no greeting, filler, or acknowledgment like 'Sure', 'Okay', or 'Sounds great': "${opening}"`;

  const editDirective =
    mode === "edit"
      ? `You are helping the student EDIT an existing ${entity} that is already filled in${
          trimmed ? ` ("${trimmed}")` : ""
        }, NOT create a new one. Do NOT walk through every section like a fresh intake. Let the student lead: ask what they want to change, update only the fields they raise via update_fields, and confirm each change out loud. Still capture any goals the instant they come up.`
      : "";

  return [openingDirective, editDirective].filter(Boolean).join(" ");
}

// ── Deterministic goal backstop ──────────────────────────────────────────────
// The coach is strongly instructed to capture goals via update_fields, but as a
// safety net the components ALSO scan the student's own transcript for explicit
// goal/target phrasing and write it to the form directly.

const GOAL_CUES: RegExp[] = [
  /\bmy (?:goal|target|aim|objective|plan)\s+(?:is|would be|will be)\s+(?:to\s+)?(.+)/i,
  /\b(?:i|we)\s+(?:want|hope|plan|aim|intend|aspire|wanna)\s+to\s+(.+)/i,
  /\b(?:i'm|i am|we're|we are)\s+(?:hoping|planning|aiming|trying)\s+to\s+(.+)/i,
  /\b(?:i'd|i would)\s+(?:like|love)\s+to\s+(.+)/i,
  /\bgoal\s+of\s+(.+)/i,
  /\blooking\s+to\s+(.+)/i,
];

// First verbs that signal conversation rather than a goal — skip these.
const NON_GOAL_VERBS = new Set([
  "add", "tell", "talk", "say", "share", "mention", "note",
  "explain", "describe", "clarify", "confirm", "skip", "ask", "know", "see",
]);

const GOAL_STOPWORDS = new Set([
  "to", "the", "a", "an", "of", "for", "my", "our", "i", "we", "want", "wanna",
  "hope", "hoping", "plan", "planning", "aim", "aiming", "like", "would", "be",
  "this", "that", "and", "or", "by", "in", "on", "at", "with", "next", "year",
]);

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Content-word token set used to compare two goals for rough equivalence. */
export function goalTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !GOAL_STOPWORDS.has(w)),
  );
}

/** True when two token sets overlap enough to be considered the same goal. */
export function goalsSimilar(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter += 1;
  const union = a.size + b.size - inter;
  return union > 0 && inter / union >= 0.5;
}

/** Conservatively pull an explicit target month (YYYY-MM) from a sentence. Only
 *  fires on a real month name to avoid guessing wrong dates from vague phrases. */
function extractTargetMonth(sentence: string): string | undefined {
  const m = sentence
    .toLowerCase()
    .match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b(?:\s+(\d{4}))?/);
  if (!m) return undefined;
  const month = MONTHS[m[1]];
  if (!month) return undefined;
  let year = m[2] ? Number.parseInt(m[2], 10) : new Date().getFullYear();
  // No explicit year and the month already passed → assume next year.
  if (!m[2] && month < new Date().getMonth() + 1) year += 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function toGoalTitle(clause: string): string {
  let t = clause.replace(/\s+/g, " ").replace(/[\s.,;:!?]+$/, "").trim();
  if (!t) return t;
  if (t.length > 90) t = `${t.slice(0, 88).trim()}…`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Detect explicit goals stated in the student's own words. */
export function detectGoalsInTranscript(transcript: string): GoalCandidate[] {
  const out: GoalCandidate[] = [];
  for (const raw of transcript.split(/(?<=[.!?])\s+|\n+/)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    for (const cue of GOAL_CUES) {
      const m = cue.exec(sentence);
      if (!m) continue;
      const clause = (m[1] ?? "").trim().replace(/[.,;:!?]+$/, "");
      const words = clause.split(/\s+/);
      if (words.length < 2) break; // too short to be a real goal
      if (NON_GOAL_VERBS.has(words[0].toLowerCase())) break; // conversational
      out.push({ title: toGoalTitle(clause), target_date: extractTargetMonth(sentence) });
      break; // at most one goal per sentence
    }
  }
  return out;
}
