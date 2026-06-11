"use client";

import {
  ChevronDown,
  FileText,
  Mic,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import {
  AwardVoiceCoach,
  type AwardVoiceUpdate,
} from "@/components/award-voice-coach";

const DEFAULT_TAGS = [
  "STEM",
  "Humanities",
  "Academic",
  "Service",
  "Creativity",
  "Leadership",
  "Passion Project",
];

import {
  createAwardFull,
  createLinkedGoal,
  deleteAward,
  reorderAwards,
  updateAwardFull,
} from "@/app/dashboard/actions";
import { LinkedGoals } from "@/components/linked-goals";
import { AssociatedWorkSection } from "@/components/associated-work-section";
import {
  BulkExportModal,
  ExportPreview,
  ReorderGutter,
  ResumeImportModal,
} from "@/components/activities-tab";
import { toast } from "@/components/toast";
import { buildAwardRecordText, collectAssociatedWork } from "@/lib/associated-record";
import {
  PendingGoalsEditor,
  mergeVoiceGoals,
  normalizeGoalMonth,
  type PendingGoal,
} from "@/components/pending-goals-editor";
import type { Activity, Award, Goal, GuidedSession, Note } from "@/lib/types";

const LEVELS = ["School", "Regional", "State", "National", "International", "Other"];

// Visual-only example goals shown alongside the sample awards so students
// see what the Goals & Targets section looks like. Never persisted.
const SAMPLE_AWARD_GOALS: Goal[][] = [
  [
    {
      id: "sample-award-goal-1a",
      title: "Move from Commended to National Merit Finalist",
      status: "active",
      target_date: "2027-02-01",
      activity_id: null,
      award_id: null,
      created_at: new Date().toISOString(),
    },
  ],
  [
    {
      id: "sample-award-goal-2a",
      title: "Place at a national-level tournament next year",
      status: "active",
      target_date: "2026-05-01",
      activity_id: null,
      award_id: null,
      created_at: new Date().toISOString(),
    },
  ],
];

const SAMPLE_AWARDS: Array<Omit<Award, "id" | "created_at">> = [
  {
    name: "National Merit Commended Scholar",
    organization: "National Merit Scholarship Corporation",
    scope: "Top 50,000 of ~1.5M PSAT takers",
    level: "National",
    year: "2024",
    description:
      "Recognized for outstanding academic potential based on PSAT/NMSQT performance during junior year.",
    requirements:
      "Awarded based on PSAT/NMSQT junior-year scores. Commended Scholars score in the top ~3-4% nationally but fall just below each state's Semifinalist cutoff.",
    activity_id: null,
    tags: ["Academic", "STEM"],
    sort_order: 0,
  },
  {
    name: "1st Place — State Speech & Debate Championship",
    organization: "California High School Speech Association",
    scope: "Lincoln-Douglas Debate division",
    level: "State",
    year: "2024",
    description:
      "Placed first in Lincoln-Douglas debate at the state championship after winning six elimination rounds against the top 32 competitors statewide.",
    requirements:
      "Qualified by placing top-3 at a regional tournament. Six preliminary rounds, then double-elimination brackets of 32 → 16 → 8 → 4 → final, judged by certified circuit judges.",
    activity_id: null,
    tags: ["Humanities", "Leadership"],
    sort_order: 1,
  },
];

type AwardDraft = {
  id: string | null;
  name: string;
  organization: string;
  scope: string;
  level: string;
  year: string;
  description: string;
  requirements: string;
  activity_id: string;
  tags: string[];
};

function toDraft(award: Award): AwardDraft {
  return {
    id: award.id,
    name: award.name,
    organization: award.organization ?? "",
    scope: award.scope ?? "",
    level: award.level ?? "",
    year: award.year ?? "",
    description: award.description ?? "",
    requirements: award.requirements ?? "",
    activity_id: award.activity_id ?? "",
    tags: award.tags ?? [],
  };
}

function emptyDraft(): AwardDraft {
  return {
    id: null,
    name: "",
    organization: "",
    scope: "",
    level: "",
    year: "",
    description: "",
    requirements: "",
    activity_id: "",
    tags: [],
  };
}

export function AwardsTab({
  awards,
  activities,
  goals,
  notes = [],
  guidedSessions = [],
}: {
  awards: Award[];
  activities: Activity[];
  goals: Goal[];
  notes?: Note[];
  guidedSessions?: GuidedSession[];
}) {
  const [editing, setEditing] = useState<{ draft: AwardDraft; voiceFirst: boolean } | null>(null);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [, startTransition] = useTransition();

  const isEmpty = awards.length === 0;

  const sampleAwards: Award[] = useMemo(
    () =>
      SAMPLE_AWARDS.map((s, i) => ({
        id: `sample-award-${i}`,
        name: s.name,
        organization: s.organization,
        scope: s.scope,
        level: s.level,
        year: s.year,
        description: s.description,
        requirements: s.requirements,
        activity_id: s.activity_id,
        tags: s.tags,
        sort_order: s.sort_order,
        created_at: new Date().toISOString(),
      })),
    [],
  );

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Delete this award? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      await deleteAward(fd);
      toast.success("Award deleted.");
    });
  }, []);

  const handleReorder = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= awards.length) return;
      const reordered = [...awards];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      const fd = new FormData();
      fd.set("order", JSON.stringify(reordered.map((a) => a.id)));
      startTransition(() => {
        void reorderAwards(fd);
      });
    },
    [awards],
  );

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl leading-tight text-[color:var(--almanac-ink)] md:text-3xl">
            Honors & recognitions
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
            Honors, placements, and scholarships — optionally linked to the activity they came from.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Occasional actions — quiet text styling so they don't compete with Add. */}
          {awards.length > 0 && (
            <button
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--almanac-ink-soft)] underline-offset-4 transition hover:text-[color:var(--almanac-ink)] hover:underline"
              onClick={() => setBulkExporting(true)}
              type="button"
            >
              <FileText size={13} />
              Export
            </button>
          )}
          <button
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--almanac-ink-soft)] underline-offset-4 transition hover:text-[color:var(--almanac-ink)] hover:underline"
            onClick={() => setImporting(true)}
            type="button"
          >
            <Upload size={13} />
            Import resume
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 px-4 py-2.5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-white"
            onClick={() => setEditing({ draft: emptyDraft(), voiceFirst: false })}
            type="button"
          >
            <Plus size={14} />
            Add award
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--almanac-ink)] px-5 py-2.5 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90"
            onClick={() => setEditing({ draft: emptyDraft(), voiceFirst: true })}
            type="button"
          >
            <Mic size={15} />
            Voice add award
          </button>
        </div>
      </header>

      {isEmpty ? (
        <section>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-2.5 text-xs text-[color:var(--almanac-ink-soft)]">
            <Sparkles size={13} />
            <span>
              <strong className="text-[color:var(--almanac-ink)]">These are samples</strong> showing what a strong entry looks like. They&apos;ll disappear once you add your own.
            </span>
          </div>
          <div className="grid gap-3">
            {sampleAwards.map((a, i) => (
              <AwardCard
                key={a.id}
                award={a}
                activities={activities}
                goals={SAMPLE_AWARD_GOALS[i] ?? []}
                onEdit={() =>
                  setEditing({ draft: { ...toDraft(a), id: null }, voiceFirst: false })
                }
                onDelete={() => {}}
                isSample
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="grid gap-3">
          {awards.map((a, idx) => (
            <AwardCard
              key={a.id}
              award={a}
              rank={idx + 1}
              activities={activities}
              goals={goals.filter((g) => g.award_id === a.id)}
              onEdit={() => setEditing({ draft: toDraft(a), voiceFirst: false })}
              onDelete={() => handleDelete(a.id)}
              onMoveUp={idx > 0 ? () => handleReorder(idx, -1) : undefined}
              onMoveDown={idx < awards.length - 1 ? () => handleReorder(idx, 1) : undefined}
            />
          ))}
        </div>
      )}

      {editing && (
        <AwardEditor
          draft={editing.draft}
          voiceFirst={editing.voiceFirst}
          activities={activities}
          existingGoals={
            editing.draft.id
              ? goals.filter((g) => g.award_id === editing.draft.id)
              : []
          }
          notes={notes}
          sessions={guidedSessions}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      )}

      {bulkExporting && (
        <BulkExportModal
          activities={activities}
          awards={awards}
          onClose={() => setBulkExporting(false)}
        />
      )}

      {importing && (
        <ResumeImportModal
          existingActivities={activities.map((a) => ({ id: a.id, name: a.name }))}
          existingAwards={awards.map((a) => ({ id: a.id, name: a.name }))}
          onClose={() => setImporting(false)}
        />
      )}
    </div>
  );
}

function AwardCard({
  award,
  activities,
  goals,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isSample = false,
  rank,
}: {
  award: Award;
  activities: Activity[];
  goals: Goal[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isSample?: boolean;
  rank?: number;
}) {
  const linkedActivity = activities.find((a) => a.id === award.activity_id);
  // Collapsed by default so the dashboard stays scannable — just the title,
  // with details/tags/goals behind a click. Samples start open as previews.
  const [expanded, setExpanded] = useState(isSample);

  return (
    <article
      className={[
        "flex gap-3 rounded-2xl border p-4 transition",
        isSample
          ? "border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)]/60"
          : "border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] hover:shadow-[0_8px_24px_rgba(31,36,51,0.08)]",
      ].join(" ")}
    >
      {rank !== undefined && (onMoveUp || onMoveDown) && (
        <ReorderGutter onMoveDown={onMoveDown} onMoveUp={onMoveUp} rank={rank} />
      )}

      <div className="min-w-0 flex-1">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <button
          aria-expanded={expanded}
          className="group min-w-0 flex-1 text-left"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          <div className="flex flex-wrap items-center gap-2">
            <ChevronDown
              className={`shrink-0 text-[color:var(--almanac-ink-soft)] transition-transform ${
                expanded ? "" : "-rotate-90"
              }`}
              size={16}
            />
            <h3 className="font-serif text-xl leading-tight text-[color:var(--almanac-ink)]">
              {award.name || "Untitled award"}
            </h3>
            {isSample && (
              <span className="inline-flex items-center rounded-full bg-[#efc97a]/30 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[color:var(--almanac-ink)]">
                Sample
              </span>
            )}
            {award.level && (
              <span className="inline-flex items-center rounded-full bg-[#4e5b7a]/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-[#4e5b7a]">
                {award.level}
              </span>
            )}
          </div>
          {expanded && (
            <p className="mt-1 pl-[26px] text-sm text-[color:var(--almanac-ink-soft)]">
              {[award.organization, award.year].filter(Boolean).join(" · ") || "—"}
            </p>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="rounded-full p-2 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
            onClick={onEdit}
            title={isSample ? "Use as template" : "Edit"}
            type="button"
          >
            <Pencil size={14} />
          </button>
          {!isSample && (
            <button
              className="rounded-full p-2 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
              onClick={onDelete}
              title="Delete"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </header>

      {expanded && (
       <>
      {award.scope && (
        <p className="mt-2 text-xs italic text-[color:var(--almanac-ink-soft)]">{award.scope}</p>
      )}

      {award.description && (
        <p className="mt-3 text-sm leading-6 text-[color:var(--almanac-ink)]/80">
          {award.description}
        </p>
      )}

      {award.requirements && (
        <p className="mt-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2 text-xs italic leading-5 text-[color:var(--almanac-ink-soft)]">
          <span className="font-semibold uppercase not-italic tracking-[0.12em]">Requirements:</span>{" "}
          {award.requirements}
        </p>
      )}

      {award.tags && award.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {award.tags.map((tag) => (
            <span
              className="inline-flex items-center rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-[color:var(--almanac-ink)]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {linkedActivity && (
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs text-[color:var(--almanac-ink-soft)]">
          Linked to: <strong className="text-[color:var(--almanac-ink)]">{linkedActivity.name}</strong>
        </p>
      )}

      <LinkedGoals
        parentId={award.id}
        parentKind="award"
        goals={goals}
        readonly={isSample}
      />
       </>
      )}
      </div>
    </article>
  );
}

function AwardEditor({
  draft: initial,
  activities,
  onCancel,
  onSaved,
  voiceFirst = false,
  existingGoals = [],
  notes = [],
  sessions = [],
}: {
  draft: AwardDraft;
  activities: Activity[];
  onCancel: () => void;
  onSaved: () => void;
  voiceFirst?: boolean;
  existingGoals?: Goal[];
  notes?: Note[];
  sessions?: GuidedSession[];
}) {
  const [draft, setDraft] = useState<AwardDraft>(initial);
  const [newTag, setNewTag] = useState("");
  const [pendingGoals, setPendingGoals] = useState<PendingGoal[]>([]);
  const [isPending, startTransition] = useTransition();
  const [exportOpen, setExportOpen] = useState(false);
  const isNew = !draft.id;
  // Tracks goal titles already persisted live (existing-award voice flow) so
  // the coach resending its full list doesn't insert duplicates.
  const savedVoiceGoalsRef = useRef<Set<string>>(new Set());

  const handleVoiceUpdate = useCallback((u: AwardVoiceUpdate) => {
    setDraft((d) => ({
      ...d,
      ...(u.name !== undefined ? { name: u.name } : null),
      ...(u.organization !== undefined ? { organization: u.organization } : null),
      ...(u.scope !== undefined ? { scope: u.scope } : null),
      ...(u.level !== undefined ? { level: u.level } : null),
      ...(u.year !== undefined ? { year: u.year } : null),
      ...(u.description !== undefined ? { description: u.description } : null),
      ...(u.requirements !== undefined ? { requirements: u.requirements } : null),
      ...(u.tags !== undefined ? { tags: u.tags } : null),
    }));

    // Goals the coach captured. For a NEW award, stage them on the draft so
    // they save with the award on create. For an EXISTING award the
    // pending-goals editor isn't shown, so persist each new goal immediately.
    if (u.goals?.length) {
      if (initial.id) {
        for (const g of u.goals) {
          const title = g.title.trim();
          const key = title.toLowerCase();
          if (title.length < 2 || savedVoiceGoalsRef.current.has(key)) continue;
          savedVoiceGoalsRef.current.add(key);
          const fd = new FormData();
          fd.set("title", title);
          const target = normalizeGoalMonth(g.target_date);
          if (target) fd.set("target_date", target);
          fd.set("award_id", initial.id);
          startTransition(() => {
            void createLinkedGoal(fd);
          });
        }
      } else {
        setPendingGoals((cur) => mergeVoiceGoals(cur, u.goals!));
      }
    }
  }, [initial.id]);

  const draftSummary = useMemo(() => {
    const parts: string[] = [];
    if (draft.name) parts.push(`name="${draft.name}"`);
    if (draft.organization) parts.push(`org="${draft.organization}"`);
    if (draft.level) parts.push(`level=${draft.level}`);
    if (draft.year) parts.push(`year=${draft.year}`);
    if (draft.scope) parts.push(`scope set`);
    if (draft.description) parts.push(`description has ${draft.description.length} chars`);
    if (draft.tags.length) parts.push(`tags=[${draft.tags.join(",")}]`);
    return parts.join("; ");
  }, [draft]);

  // Brainstorm sessions + notes linked to this (already-saved) award, and the
  // bundled "Full record" export text. Empty for a brand-new award.
  const associated = useMemo(
    () =>
      initial.id
        ? collectAssociatedWork({
            kind: "award",
            id: initial.id,
            notes,
            goals: existingGoals,
            sessions,
          })
        : { notes: [], sessions: [] },
    [initial.id, notes, existingGoals, sessions],
  );

  const fullRecordText = useMemo(
    () =>
      initial.id ? buildAwardRecordText(awardDraftToAward(draft), existingGoals, associated) : "",
    [initial.id, draft, existingGoals, associated],
  );

  const update = useCallback(<K extends keyof AwardDraft>(key: K, value: AwardDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(tag) ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
    }));
  }, []);

  const addCustomTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    setDraft((d) => (d.tags.includes(trimmed) ? d : { ...d, tags: [...d.tags, trimmed] }));
    setNewTag("");
  }, [newTag]);

  const allTags = useMemo(() => {
    const set = new Set<string>(DEFAULT_TAGS);
    draft.tags.forEach((t) => set.add(t));
    return Array.from(set);
  }, [draft.tags]);

  const handleSave = useCallback(() => {
    if (!draft.name.trim()) return;
    const fd = new FormData();
    if (draft.id) fd.set("id", draft.id);
    fd.set("name", draft.name);
    fd.set("organization", draft.organization);
    fd.set("scope", draft.scope);
    fd.set("level", draft.level);
    fd.set("year", draft.year);
    fd.set("description", draft.description);
    fd.set("requirements", draft.requirements);
    fd.set("activity_id", draft.activity_id);
    fd.set("tags", JSON.stringify(draft.tags));
    if (isNew && pendingGoals.length) {
      fd.set(
        "pending_goals",
        JSON.stringify(
          pendingGoals.map((g) => ({ title: g.title, target_date: g.target_date })),
        ),
      );
    }
    startTransition(async () => {
      if (draft.id) await updateAwardFull(fd);
      else await createAwardFull(fd);
      onSaved();
    });
  }, [draft, pendingGoals, isNew, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">
            {draft.id ? "Edit award" : "New award"}
          </h3>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid gap-4 px-6 py-5">
          <AwardVoiceCoach
            autoStart={voiceFirst}
            onUpdate={handleVoiceUpdate}
            currentDraftSummary={draftSummary}
            mode={isNew ? "add" : "edit"}
            awardName={draft.name}
          />

          <Field label="Award name">
            <TextInput
              value={draft.name}
              onChange={(v) => update("name", v)}
              placeholder="e.g., National Merit Scholar"
            />
          </Field>

          <Field label="Organization / Issuer">
            <TextInput
              value={draft.organization}
              onChange={(v) => update("organization", v)}
              placeholder="e.g., National Merit Scholarship Corporation"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Level">
              <SelectInput
                value={draft.level}
                onChange={(v) => update("level", v)}
                options={LEVELS}
                placeholder="Select level…"
              />
            </Field>
            <Field label="Year">
              <TextInput
                value={draft.year}
                onChange={(v) => update("year", v)}
                placeholder="e.g., 2024"
              />
            </Field>
          </div>

          <Field label="Scope / Context (optional)">
            <TextInput
              value={draft.scope}
              onChange={(v) => update("scope", v)}
              placeholder="e.g., Top 1% of ~1.5M PSAT takers"
            />
          </Field>

          <Field label="Description (optional)" hint={`${draft.description.length} chars`}>
            <textarea
              className="min-h-[5rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              maxLength={2000}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Add context — what was it for, how competitive, what it represents..."
              value={draft.description}
            />
          </Field>

          <Field
            label="Requirements / How it's earned (optional)"
            hint={`${draft.requirements.length} chars`}
          >
            <textarea
              className="min-h-[5rem] w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
              maxLength={2000}
              onChange={(e) => update("requirements", e.target.value)}
              placeholder="What were the criteria? E.g. minimum score, application essay, judging rounds, selection percentage..."
              value={draft.requirements}
            />
          </Field>

          {activities.length > 0 && (
            <Field label="Linked activity (optional)">
              <SelectInput
                value={draft.activity_id}
                onChange={(v) => update("activity_id", v)}
                options={activities.map((a) => a.id)}
                renderOption={(id) => activities.find((a) => a.id === id)?.name ?? id}
                placeholder="None"
              />
            </Field>
          )}

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const active = draft.tags.includes(tag);
                return (
                  <button
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                        : "border-[color:var(--almanac-rule)] bg-white/60 text-[color:var(--almanac-ink)] hover:border-[color:var(--almanac-ink-soft)]",
                    ].join(" ")}
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {tag}
                    {active && <X size={10} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="Add custom tag..."
                type="text"
                value={newTag}
              />
              <button
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--almanac-rule)] px-3 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
                onClick={addCustomTag}
                type="button"
              >
                <Plus size={12} />
              </button>
            </div>
          </Field>

          {/* Goals section — targets tied to this award */}
          {isNew ? (
            <PendingGoalsEditor goals={pendingGoals} onChange={setPendingGoals} />
          ) : (
            <LinkedGoals
              parentId={draft.id!}
              parentKind="award"
              goals={existingGoals}
            />
          )}

          {/* Brainstorm sessions & notes linked to this award (existing only) */}
          {!isNew && (
            <AssociatedWorkSection
              parentId={draft.id!}
              parentKind="award"
              notes={associated.notes}
              allNotes={notes}
              sessions={associated.sessions}
            />
          )}

          {/* Export this award — full record (goals, sessions & notes) or resume line */}
          {!isNew && draft.name.trim() ? (
            <div className="border-t border-[color:var(--almanac-rule)] pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[color:var(--almanac-ink)]">
                    Export this award
                  </p>
                  <p className="mt-0.5 text-[0.7rem] leading-4 text-[color:var(--almanac-ink-soft)]">
                    Copy it as a resume entry, or export the full record with goals, sessions & notes.
                  </p>
                </div>
                <button
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--almanac-rule)] px-4 py-2 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
                  onClick={() => setExportOpen(true)}
                  type="button"
                >
                  <FileText size={13} />
                  Export
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {exportOpen ? (
          <AwardExportModal
            award={awardDraftToAward(draft)}
            fullRecordText={fullRecordText}
            onClose={() => setExportOpen(false)}
          />
        ) : null}

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--almanac-rule)] px-6 py-4">
          <button
            className="rounded-full border border-[color:var(--almanac-rule)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[color:var(--almanac-ink)] px-5 py-2 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
            disabled={isPending || !draft.name.trim()}
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Saving…" : draft.id ? "Update award" : "Save award"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function awardDraftToAward(d: AwardDraft): Award {
  return {
    id: d.id ?? "draft",
    name: d.name,
    scope: d.scope || null,
    year: d.year || null,
    organization: d.organization || null,
    description: d.description || null,
    requirements: d.requirements || null,
    level: d.level || null,
    activity_id: d.activity_id || null,
    tags: d.tags,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

/** Resume-style honor line for a single award. */
function formatAwardResumeLine(a: Award): string {
  const meta = [a.organization, a.scope, a.level, a.year].filter(Boolean).join(" · ");
  const lines = [a.name];
  if (meta) lines.push(meta);
  if (a.description) lines.push(a.description);
  return lines.join("\n");
}

type AwardExportTab = "full" | "resume";

function AwardExportModal({
  award,
  fullRecordText,
  onClose,
}: {
  award: Award;
  fullRecordText: string;
  onClose: () => void;
}) {
  const hasFull = Boolean(fullRecordText && fullRecordText.trim());
  const [tab, setTab] = useState<AwardExportTab>(hasFull ? "full" : "resume");

  const generated = tab === "full" ? fullRecordText : formatAwardResumeLine(award);
  const formatLabel = tab === "full" ? "Full record" : "Resume";

  const tabs: Array<[AwardExportTab, string]> = [
    ...(hasFull ? ([["full", "Full record"]] as Array<[AwardExportTab, string]>) : []),
    ["resume", "Resume"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-6 py-4">
          <div>
            <h3 className="font-serif text-2xl text-[color:var(--almanac-ink)]">Export</h3>
            <p className="text-xs text-[color:var(--almanac-ink-soft)]">{award.name}</p>
          </div>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="border-b border-[color:var(--almanac-rule)] px-6 pt-4">
          <div className="inline-flex gap-1 rounded-full border border-[color:var(--almanac-rule)] bg-white/60 p-1">
            {tabs.map(([id, label]) => {
              const active = tab === id;
              return (
                <button
                  className={[
                    "rounded-full px-4 py-1.5 text-xs font-medium transition",
                    active
                      ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                      : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                  ].join(" ")}
                  key={id}
                  onClick={() => setTab(id)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <ExportPreview
          key={tab}
          docTitle={`${award.name} — ${formatLabel}`}
          fileBase={`${award.name}-${formatLabel}`}
          initialText={generated}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex items-baseline justify-between gap-3 text-xs font-medium text-[color:var(--almanac-ink)]">
        <span>{label}</span>
        {hint && <span className="text-[0.65rem] font-normal text-[color:var(--almanac-ink-soft)]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="w-full rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[#3F4A66] focus:bg-white"
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  renderOption,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  renderOption?: (v: string) => string;
}) {
  return (
    <div className="relative">
      <select
        className="w-full appearance-none rounded-xl border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2.5 pr-9 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66] focus:bg-white"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {renderOption ? renderOption(opt) : opt}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--almanac-ink-soft)]"
        size={16}
      />
    </div>
  );
}
