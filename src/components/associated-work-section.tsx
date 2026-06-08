"use client";

import { FileText, MessagesSquare, Sparkles } from "lucide-react";

import type { GuidedSession, Note } from "@/lib/types";

/**
 * Read-only panel listing the brainstorm (guided) sessions and notes/reflections
 * associated with an activity or award. Rendered in the editor after the Goals &
 * Targets section. Tagging itself still happens on the card's "Tagged Posts"
 * control and in the Sessions tab — this surface is for review + export context.
 */
export function AssociatedWorkSection({
  notes,
  sessions,
}: {
  notes: Note[];
  sessions: GuidedSession[];
}) {
  const total = notes.length + sessions.length;

  return (
    <div className="rounded-xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-[color:var(--almanac-ink)]">
        <Sparkles size={13} />
        Brainstorm sessions &amp; notes ({total})
      </p>
      <p className="mt-1 text-[0.7rem] leading-4 text-[color:var(--almanac-ink-soft)]">
        Sessions and reflections linked to this entry. Included when you export the full record.
      </p>

      {total === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2 text-xs text-[color:var(--almanac-ink-soft)]">
          Nothing linked yet. Tag a reflection from the card, or run a “Deepen” session to build the story behind this entry.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {sessions.map((s) => (
            <div
              className="flex items-start gap-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/50 px-3 py-2"
              key={s.id}
            >
              <MessagesSquare className="mt-0.5 shrink-0 text-[color:var(--almanac-ink-soft)]" size={13} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 text-[color:var(--almanac-ink)]">{s.session_label}</p>
                {(s.summary || s.focus) && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
                    {s.summary || s.focus}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                Session
              </span>
            </div>
          ))}

          {notes.map((n) => (
            <div
              className="flex items-start gap-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/50 px-3 py-2"
              key={n.id}
            >
              <FileText className="mt-0.5 shrink-0 text-[color:var(--almanac-ink-soft)]" size={13} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-5 text-[color:var(--almanac-ink)]">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
                    {n.body}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--almanac-ink-soft)]">
                Note
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
