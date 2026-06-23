"use client";

import {
  Award as AwardIcon,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Pencil,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";

import { toast } from "@/components/toast";
import { PdfDoc, docTitle } from "@/lib/pdf-doc";
import {
  deleteActivity,
  deleteAward,
  deleteNote,
  updateActivity,
  updateAwardFull,
  updateNote,
} from "@/app/dashboard/actions";
import type {
  Activity,
  Award,
  Goal,
  Note,
  WeeklyChallenge,
} from "@/lib/types";

type Props = {
  activities: Activity[];
  awards: Award[];
  notes: Note[];
  goals: Goal[];
  ownerName: string;
  weeklyChallenges: WeeklyChallenge[];
};

type ItemKind = "activity" | "award" | "achievement" | "note" | "challenge";

type TimelineItem = {
  kind: ItemKind;
  /** Side of the spine the item renders on. */
  side: "left" | "right";
  /** ID — for DB items this is the real row id; for read-only items it's a synthetic key. */
  id: string;
  /** ISO timestamp for this event. */
  date: string;
  title: string;
  summary: string | null;
  /** Display label for the type pill. */
  label: string;
  /** Lucide icon component. */
  icon: typeof Calendar;
  /** Accent color for the type pill. */
  color: string;
  /** Original record — used by the edit/delete handlers. */
  raw: Activity | Award | Note | Goal | WeeklyChallenge;
  /** Whether this item is editable / deletable. */
  editable: boolean;
};

// Color tokens — kept inline so the component doesn't depend on theme vars.
const COLOR_ACTIVITY = "#4e5b7a";
const COLOR_AWARD = "#d27b57";
const COLOR_ACHIEVEMENT = "#7a9e7a";
const COLOR_NOTE = "#efc97a";
const COLOR_CHALLENGE = "#9b7ab8";

export function TimelineBoard({
  activities,
  awards,
  notes,
  goals,
  ownerName,
  weeklyChallenges,
}: Props) {
  const [fromDate, setFromDate] = useState(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState("");
  const [query, setQuery] = useState(""); // free-text keyword filter
  const [editing, setEditing] = useState<TimelineItem | null>(null);
  const [, startTransition] = useTransition();

  // Group all events into date buckets (YYYY-MM-DD), newest first.
  const dateBuckets = useMemo(() => {
    const all: TimelineItem[] = [
      // LEFT — milestone-like entries
      ...activities.map((a): TimelineItem => ({
        kind: "activity",
        side: "left",
        id: a.id,
        date: a.created_at,
        title: a.name,
        summary:
          a.description ||
          a.impact ||
          [a.position, a.category].filter(Boolean).join(" · ") ||
          null,
        label: "Activity",
        icon: Calendar,
        color: COLOR_ACTIVITY,
        raw: a,
        editable: true,
      })),
      ...awards.map((a): TimelineItem => ({
        kind: "award",
        side: "left",
        id: a.id,
        date: a.created_at,
        title: a.name,
        summary:
          a.description ||
          [a.organization, a.year].filter(Boolean).join(" · ") ||
          null,
        label: "Award",
        icon: AwardIcon,
        color: COLOR_AWARD,
        raw: a,
        editable: true,
      })),
      ...goals
        .filter((g) => g.status === "achieved")
        .map((g): TimelineItem => ({
          kind: "achievement",
          side: "left",
          id: g.id,
          // Goals don't track a completion timestamp — fall back to target_date,
          // and then created_at if no target was set.
          date: g.target_date ?? g.created_at,
          title: g.title,
          summary: g.target_date ? `Goal achieved` : `Goal achieved (no target date)`,
          label: "Achievement",
          icon: Trophy,
          color: COLOR_ACHIEVEMENT,
          raw: g,
          editable: false,
        })),

      // RIGHT — reflections & intentions
      ...notes.map((n): TimelineItem => {
        const isBrainstorm = /brainstorm|idea/i.test(n.category ?? "");
        return {
          kind: "note",
          side: "right",
          id: n.id,
          date: n.updated_at ?? n.created_at,
          title: n.title || "Untitled note",
          summary: n.body,
          label: isBrainstorm ? "Brainstorm" : "Note",
          icon: isBrainstorm ? Sparkles : BookOpen,
          color: COLOR_NOTE,
          raw: n,
          editable: true,
        };
      }),
      ...weeklyChallenges.map((c): TimelineItem => ({
        kind: "challenge",
        side: "right",
        id: c.id,
        date: c.created_at,
        title: c.title,
        summary:
          c.description ||
          (c.category ? `Category: ${c.category}` : "Weekly challenge") ||
          null,
        label:
          c.status === "completed"
            ? "Challenge · Done"
            : c.status === "missed"
              ? "Challenge · Missed"
              : "Challenge",
        icon: Target,
        color: COLOR_CHALLENGE,
        raw: c,
        editable: false,
      })),
    ];

    const inRange = (iso: string) => {
      const t = Date.parse(iso);
      if (Number.isNaN(t)) return true;
      if (fromDate) {
        const from = Date.parse(`${fromDate}T00:00:00`);
        if (!Number.isNaN(from) && t < from) return false;
      }
      if (toDate) {
        const to = Date.parse(`${toDate}T23:59:59`);
        if (!Number.isNaN(to) && t > to) return false;
      }
      return true;
    };

    const q = query.trim().toLowerCase();
    const matchesQuery = (item: TimelineItem) => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.summary ?? "").toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q)
      );
    };

    const filtered = all.filter(
      (item) => inRange(item.date) && matchesQuery(item),
    );

    // Bucket by calendar day (local time). Within a bucket, sort by timestamp desc.
    const map = new Map<string, TimelineItem[]>();
    for (const item of filtered) {
      const day = dayKey(item.date);
      const arr = map.get(day);
      if (arr) arr.push(item);
      else map.set(day, [item]);
    }
    for (const items of map.values()) {
      items.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    }

    // Newest day first.
    return Array.from(map.entries()).sort(([a], [b]) =>
      a < b ? 1 : a > b ? -1 : 0,
    );
  }, [activities, awards, notes, goals, weeklyChallenges, fromDate, toDate, query]);

  const handleDelete = useCallback((item: TimelineItem) => {
    if (!item.editable) return;
    if (
      !confirm(
        `Remove this ${item.kind} from your timeline? This deletes the entry itself.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("id", item.id);
    startTransition(async () => {
      if (item.kind === "activity") await deleteActivity(fd);
      else if (item.kind === "award") await deleteAward(fd);
      else if (item.kind === "note") await deleteNote(fd);
    });
  }, []);

  const handlePrint = useCallback(() => {
    // Render a real downloadable PDF from the data (no print dialog, no
    // html2canvas — which can't parse Tailwind v4's oklch() colors).
    const pdf = new PdfDoc();
    pdf.add({ type: "title", text: docTitle(ownerName, "Timeline") });
    pdf.add({
      type: "subtitle",
      text:
        fromDate || toDate
          ? `Range: ${fromDate || "earliest"} → ${toDate || "latest"}`
          : "All entries",
    });
    pdf.add({ type: "rule" });

    if (dateBuckets.length === 0) {
      pdf.add({ type: "muted", text: "Nothing here yet." });
    } else {
      for (const [day, items] of dateBuckets) {
        pdf.add({ type: "heading", text: formatDay(day) });
        for (const item of items) {
          pdf.add({ type: "subheading", text: `${item.label}: ${item.title}` });
          if (item.summary) pdf.add({ type: "body", text: item.summary });
        }
      }
    }
    pdf.save(docTitle(ownerName, "Timeline").replace(/[^a-z0-9]+/gi, "-").toLowerCase());
    toast.success("Timeline downloaded as PDF.");
  }, [dateBuckets, fromDate, toDate, ownerName]);

  const totalCount = useMemo(
    () => dateBuckets.reduce((n, [, items]) => n + items.length, 0),
    [dateBuckets],
  );

  // Group the day-buckets under their month (newest month first). Each month
  // keeps its ordered day-buckets and a running item count for the header.
  const monthGroups = useMemo(() => {
    const groups = new Map<string, { days: typeof dateBuckets; count: number }>();
    for (const [day, items] of dateBuckets) {
      const mk = monthKey(day);
      const g = groups.get(mk);
      if (g) {
        g.days.push([day, items]);
        g.count += items.length;
      } else {
        groups.set(mk, { days: [[day, items]], count: items.length });
      }
    }
    return Array.from(groups.entries()); // already newest-first (dateBuckets is sorted desc)
  }, [dateBuckets]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleMonth = useCallback((mk: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(mk)) next.delete(mk);
      else next.add(mk);
      return next;
    });
  }, []);

  const jumpToMonth = useCallback((mk: string) => {
    // Expand it if collapsed, then scroll its header into view.
    setCollapsed((prev) => {
      if (!prev.has(mk)) return prev;
      const next = new Set(prev);
      next.delete(mk);
      return next;
    });
    requestAnimationFrame(() => {
      document
        .getElementById(`tl-month-${mk}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="px-5 py-6 md:px-9">
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 print:hidden md:flex-row md:flex-wrap md:items-end md:justify-between">
        <div className="flex flex-col items-center gap-3 md:flex-row md:flex-wrap md:items-end md:justify-start">
          {/* Keyword search */}
          <div className="w-full max-w-xs md:w-60">
            <label className="block text-center text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)] md:text-left">
              Search
            </label>
            <input
              className="mt-0.5 w-full rounded-md border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-2.5 py-1.5 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword…"
              type="search"
              value={query}
            />
          </div>
          {/* Date range — centered group on mobile */}
          <div className="flex items-end justify-center gap-3">
            <div>
              <label className="block text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
                From
              </label>
              <input
                className="mt-0.5 rounded-md border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-2.5 py-1.5 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => setFromDate(e.target.value)}
                type="date"
                value={fromDate}
              />
            </div>
            <div>
              <label className="block text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
                To
              </label>
              <input
                className="mt-0.5 rounded-md border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] px-2.5 py-1.5 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[#3F4A66]"
                onChange={(e) => setToDate(e.target.value)}
                type="date"
                value={toDate}
              />
            </div>
          </div>
          {(fromDate || toDate || query) && (
            <button
              className="rounded-md px-2 py-1 text-xs text-[color:var(--almanac-ink-soft)] underline hover:text-[color:var(--almanac-ink)] md:mb-0.5"
              onClick={() => {
                setFromDate("");
                setToDate("");
                setQuery("");
              }}
              type="button"
            >
              Clear
            </button>
          )}
        </div>

        <button
          className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-[color:var(--almanac-ink)] px-4 py-2 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 md:self-auto"
          onClick={handlePrint}
          type="button"
        >
          <Download size={14} />
          Export as PDF
        </button>
      </div>

      {/* Column legend */}
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 print:hidden">
        <p className="text-right text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          Activities · Awards · Achievements
        </p>
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          ←&nbsp;day&nbsp;→
        </span>
        <p className="text-left text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
          Notes · Brainstorms · Challenges
        </p>
      </div>

      <div
        className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 md:p-6 print:border-0 print:bg-white print:p-0"
        data-timeline-print="true"
      >
        <header className="mb-5 hidden print:block">
          <h1 className="text-2xl font-semibold">Timeline</h1>
          <p className="text-sm text-gray-600">
            {fromDate || toDate
              ? `Range: ${fromDate || "earliest"} → ${toDate || "latest"}`
              : "All entries"}
          </p>
        </header>

        {totalCount === 0 ? (
          <p className="py-10 text-center text-sm text-[color:var(--almanac-ink-soft)]">
            {query || fromDate || toDate
              ? "No entries match your search. Try a different keyword or date range."
              : "Nothing here yet. Add an activity, award, note, or challenge — and it will appear on your timeline automatically."}
          </p>
        ) : (
          <div className="flex gap-4">
            {/* Sticky jump-to-month rail (hidden on small screens + print). */}
            {monthGroups.length > 1 && (
              <nav className="sticky top-4 hidden h-fit max-h-[80vh] shrink-0 flex-col gap-1 overflow-y-auto pr-1 md:flex print:hidden">
                {monthGroups.map(([mk, group]) => (
                  <button
                    className="group flex items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[0.7rem] text-[color:var(--almanac-ink-soft)] transition hover:bg-black/[0.04] hover:text-[color:var(--almanac-ink)]"
                    key={mk}
                    onClick={() => jumpToMonth(mk)}
                    type="button"
                  >
                    <span className="whitespace-nowrap font-medium">
                      {formatMonthShort(mk)}
                    </span>
                    <span className="shrink-0 rounded-full bg-black/[0.06] px-1.5 text-[0.6rem] tabular-nums text-[color:var(--almanac-ink-soft)]">
                      {group.count}
                    </span>
                  </button>
                ))}
              </nav>
            )}

            <div className="relative min-w-0 flex-1">
              {/* Vertical spine — runs the full height behind the date markers */}
              <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-[color:var(--almanac-rule)]" />

              <div className="relative space-y-6">
                {monthGroups.map(([mk, group]) => {
                  const isCollapsed = collapsed.has(mk);
                  return (
                    <section key={mk}>
                      {/* Month header — centered on the spine, click to collapse. */}
                      <div
                        className="relative z-10 mb-4 flex justify-center print:hidden"
                        id={`tl-month-${mk}`}
                      >
                        <button
                          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-1.5 text-sm font-semibold text-[color:var(--almanac-ink)] shadow-sm transition hover:bg-[color:var(--almanac-paper)]"
                          onClick={() => toggleMonth(mk)}
                          type="button"
                        >
                          <ChevronDown
                            className={[
                              "transition-transform",
                              isCollapsed ? "-rotate-90" : "",
                            ].join(" ")}
                            size={14}
                          />
                          {formatMonth(mk)}
                          <span className="rounded-full bg-black/[0.06] px-1.5 text-[0.65rem] tabular-nums text-[color:var(--almanac-ink-soft)]">
                            {group.count}
                          </span>
                        </button>
                      </div>
                      {/* Print: show the month as a plain heading. */}
                      <h2 className="mb-2 hidden text-lg font-semibold print:block">
                        {formatMonth(mk)}
                      </h2>

                      {!isCollapsed && (
                        <div className="space-y-6">
                          {group.days.map(([day, items]) => (
                            <DateBucket
                              key={day}
                              day={day}
                              items={items}
                              onEdit={setEditing}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditModal item={editing} onClose={() => setEditing(null)} />
      )}

      <style jsx global>{`
        @media print {
          nav,
          aside,
          header[data-app-header],
          .print\\:hidden {
            display: none !important;
          }
          [data-timeline-print="true"] article {
            page-break-inside: avoid;
            border: 1px solid #ddd !important;
            background: white !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}

function DateBucket({
  day,
  items,
  onEdit,
  onDelete,
}: {
  day: string;
  items: TimelineItem[];
  onEdit: (item: TimelineItem) => void;
  onDelete: (item: TimelineItem) => void;
}) {
  const leftItems = items.filter((i) => i.side === "left");
  const rightItems = items.filter((i) => i.side === "right");

  return (
    <section className="relative">
      {/* Centered date pill — sits on the spine */}
      <div className="mb-4 flex items-center justify-center">
        <span className="rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.15em] text-[color:var(--almanac-ink)] shadow-sm">
          {formatDay(day)}
        </span>
      </div>

      {/* Two columns of cards */}
      <div className="grid grid-cols-2 gap-4 md:gap-8">
        <div className="flex flex-col items-end gap-3">
          {leftItems.length === 0 ? (
            <div className="text-[0.7rem] italic text-[color:var(--almanac-ink-soft)]/60">
              —
            </div>
          ) : (
            leftItems.map((item) => (
              <TimelineCard
                key={`${item.kind}-${item.id}`}
                item={item}
                align="left"
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            ))
          )}
        </div>
        <div className="flex flex-col items-start gap-3">
          {rightItems.length === 0 ? (
            <div className="text-[0.7rem] italic text-[color:var(--almanac-ink-soft)]/60">
              —
            </div>
          ) : (
            rightItems.map((item) => (
              <TimelineCard
                key={`${item.kind}-${item.id}`}
                item={item}
                align="right"
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  item,
  align,
  onEdit,
  onDelete,
}: {
  item: TimelineItem;
  align: "left" | "right";
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = item.icon;
  return (
    <article
      className={[
        "group relative w-full max-w-md rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-3",
        align === "left" ? "text-right" : "text-left",
      ].join(" ")}
    >
      <header
        className={[
          "flex items-start gap-2",
          align === "left" ? "flex-row-reverse" : "",
        ].join(" ")}
      >
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em]"
          style={{ color: item.color, backgroundColor: `${item.color}1F` }}
        >
          <Icon size={10} />
          {item.label}
        </span>
        <p className="flex-1 text-[0.65rem] uppercase tracking-[0.15em] text-[color:var(--almanac-ink-soft)]">
          {formatTime(item.date)}
        </p>
        {item.editable && (
          <div
            className={[
              "flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100 print:hidden",
              align === "left" ? "order-first" : "",
            ].join(" ")}
          >
            <button
              className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
              onClick={onEdit}
              title="Edit"
              type="button"
            >
              <Pencil size={11} />
            </button>
            <button
              className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-red-500/10 hover:text-red-600"
              onClick={onDelete}
              title="Delete"
              type="button"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </header>

      <h3 className="mt-1.5 font-serif text-lg leading-tight text-[color:var(--almanac-ink)]">
        {item.kind === "achievement" && (
          <CheckCircle2
            className="mr-1 inline text-[color:var(--almanac-sage,#7a9e7a)]"
            size={14}
          />
        )}
        {item.title}
      </h3>

      {item.summary && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-5 text-[color:var(--almanac-ink)]/75">
          {item.summary}
        </p>
      )}
    </article>
  );
}

function EditModal({
  item,
  onClose,
}: {
  item: TimelineItem;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.summary ?? "");
  const [timelineDate, setTimelineDate] = useState(dayKey(item.date));
  const [isPending, startTransition] = useTransition();

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    const fd = new FormData();
    fd.set("id", item.id);
    // Only send a timeline date if the user actually changed it.
    if (timelineDate && timelineDate !== dayKey(item.date)) {
      fd.set("timeline_date", timelineDate);
    }
    startTransition(async () => {
      if (item.kind === "note") {
        const raw = item.raw as Note;
        fd.set("title", title.trim());
        fd.set("body", body);
        void raw;
        await updateNote(fd);
      } else if (item.kind === "activity") {
        const a = item.raw as Activity;
        fd.set("name", title.trim());
        fd.set("category", a.category ?? "");
        fd.set("position", a.position ?? a.role ?? "");
        fd.set("description", body);
        fd.set("organization_description", a.organization_description ?? "");
        fd.set("grades", JSON.stringify(a.grades ?? []));
        fd.set("start_date", a.start_date ?? "");
        fd.set("end_date", a.end_date ?? "");
        fd.set("in_progress", a.in_progress ? "true" : "false");
        fd.set("hours_per_week", String(a.hours_per_week ?? 0));
        fd.set("weeks_per_year", String(a.weeks_per_year ?? 0));
        fd.set("tags", JSON.stringify(a.tags ?? []));
        await updateActivity(fd);
      } else if (item.kind === "award") {
        const a = item.raw as Award;
        fd.set("name", title.trim());
        fd.set("organization", a.organization ?? "");
        fd.set("scope", a.scope ?? "");
        fd.set("level", a.level ?? "");
        fd.set("year", a.year ?? "");
        fd.set("description", body);
        fd.set("requirements", a.requirements ?? "");
        fd.set("activity_id", a.activity_id ?? "");
        fd.set("tags", JSON.stringify(a.tags ?? []));
        await updateAwardFull(fd);
      }
      onClose();
    });
  }, [item, title, body, timelineDate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm print:hidden">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[color:var(--almanac-rule)] px-5 py-3">
          <h3 className="font-serif text-xl text-[color:var(--almanac-ink)]">
            Edit {item.kind}
          </h3>
          <button
            className="rounded-full p-1.5 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <label className="block">
            <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Title
            </span>
            <input
              autoFocus
              className="mt-1 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-[#3F4A66] focus:bg-white"
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              value={title}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
              {item.kind === "note" ? "Body" : "Description"}
            </span>
            <textarea
              className="mt-1 min-h-[8rem] w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-sm leading-5 outline-none focus:border-[#3F4A66] focus:bg-white"
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              value={body}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-[color:var(--almanac-ink)]">
              Date on timeline
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 px-3 py-2 text-sm outline-none focus:border-[#3F4A66] focus:bg-white"
              onChange={(e) => setTimelineDate(e.target.value)}
              type="date"
              value={timelineDate}
            />
            <span className="mt-1 block text-[0.65rem] text-[color:var(--almanac-ink-soft)]">
              Changes where this entry appears on your timeline.
            </span>
          </label>
          <p className="text-[0.65rem] text-[color:var(--almanac-ink-soft)]">
            For deeper edits (tags, goals), open the dedicated tab.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--almanac-rule)] px-5 py-3">
          <button
            className="rounded-full border border-[color:var(--almanac-rule)] px-4 py-1.5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[color:var(--almanac-ink)] px-4 py-1.5 text-sm font-medium text-[color:var(--almanac-paper)] transition hover:opacity-90 disabled:opacity-50"
            disabled={isPending || !title.trim()}
            onClick={handleSave}
            type="button"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDay(key: string): string {
  const [y, m, d] = key.split("-").map((p) => Number(p));
  if (!y || !m || !d) return key;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2026-06-14" → "2026-06" */
function monthKey(dayKeyStr: string): string {
  return dayKeyStr.slice(0, 7);
}

/** "2026-06" → "June 2026" */
function formatMonth(key: string): string {
  const [y, m] = key.split("-").map((p) => Number(p));
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/** "2026-06" → "Jun '26" (compact label for the jump rail) */
function formatMonthShort(key: string): string {
  const [y, m] = key.split("-").map((p) => Number(p));
  if (!y || !m) return key;
  return `${new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "short",
  })} '${String(y).slice(2)}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
