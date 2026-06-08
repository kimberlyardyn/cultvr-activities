"use client";

import { ChevronDown, FileText, MessagesSquare, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { createNoteForParent, tagNoteToParent } from "@/app/dashboard/actions";
import type { GuidedSession, Note } from "@/lib/types";

/**
 * The brainstorm (guided) sessions and notes/reflections associated with an
 * activity or award, rendered in the editor after the Goals & Targets section.
 *
 * Notes are interactive — link an existing reflection, write a new one, or
 * unlink one — mirroring the card's "Tagged Posts" control. Sessions are
 * display-only: they attach to an entry indirectly (through the note or goal
 * they produced), so there's nothing to tag here. Everything shown is included
 * in the entry's "Full record" export.
 */
export function AssociatedWorkSection({
  parentId,
  parentKind,
  notes,
  allNotes,
  sessions,
}: {
  parentId: string;
  parentKind: "activity" | "award";
  /** Notes already linked to this entry. */
  notes: Note[];
  /** Full note list, used to offer linking an existing reflection. */
  allNotes: Note[];
  sessions: GuidedSession[];
}) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLinked = useCallback(
    (n: Note) => (parentKind === "activity" ? n.activity_id === parentId : n.award_id === parentId),
    [parentKind, parentId],
  );

  const unlinked = allNotes.filter((n) => !isLinked(n));

  const setLink = useCallback(
    (noteId: string, link: boolean) => {
      const fd = new FormData();
      fd.set("note_id", noteId);
      fd.set("parent_kind", parentKind);
      fd.set("parent_id", link ? parentId : "");
      startTransition(() => {
        void tagNoteToParent(fd);
      });
    },
    [parentKind, parentId],
  );

  const handleCreate = useCallback(() => {
    if (!newTitle.trim() || !newBody.trim()) return;
    const fd = new FormData();
    fd.set("title", newTitle.trim());
    fd.set("body", newBody.trim());
    fd.set("parent_kind", parentKind);
    fd.set("parent_id", parentId);
    startTransition(async () => {
      await createNoteForParent(fd);
      setNewTitle("");
      setNewBody("");
      setAdding(false);
    });
  }, [newTitle, newBody, parentKind, parentId]);

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
            className="group flex items-start gap-3 rounded-lg border border-[color:var(--almanac-rule)] bg-white/50 px-3 py-2"
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
            <button
              className="shrink-0 rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
              disabled={isPending}
              onClick={() => setLink(n.id, false)}
              title="Unlink note"
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {total === 0 && !adding && (
          <div className="rounded-lg border border-dashed border-[color:var(--almanac-rule)] bg-white/40 px-3 py-2 text-xs text-[color:var(--almanac-ink-soft)]">
            Nothing linked yet. Write a reflection or link an existing one — or run a “Deepen” session to build the story behind this entry.
          </div>
        )}

        {adding ? (
          <div className="space-y-2 rounded-lg border border-[color:var(--almanac-rule)] bg-white/60 p-3">
            <input
              className="w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Reflection title…"
              value={newTitle}
            />
            <textarea
              className="min-h-[4rem] w-full rounded-md border border-[color:var(--almanac-rule)] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#3F4A66]"
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="What happened? What did you learn?"
              value={newBody}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md px-3 py-1 text-xs text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                  setNewBody("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-[color:var(--almanac-ink)] px-3 py-1 text-xs font-medium text-[color:var(--almanac-paper)] disabled:opacity-50"
                disabled={isPending || !newTitle.trim() || !newBody.trim()}
                onClick={handleCreate}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-white/60"
              onClick={() => setAdding(true)}
              type="button"
            >
              <Plus size={11} />
              New post
            </button>
            {unlinked.length > 0 && (
              <LinkExistingPicker notes={unlinked} onSelect={(id) => setLink(id, true)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LinkExistingPicker({
  notes,
  onSelect,
}: {
  notes: Note[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-1 rounded-full border border-[color:var(--almanac-rule)] px-3 py-1.5 text-xs font-medium text-[color:var(--almanac-ink)] transition hover:bg-white/60"
        onClick={() => setOpen(!open)}
        type="button"
      >
        Link existing post
        <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-72 overflow-y-auto rounded-lg border border-[color:var(--almanac-rule)] bg-white shadow-lg">
          {notes.map((n) => (
            <button
              className="block w-full px-3 py-2 text-left text-xs hover:bg-black/5"
              key={n.id}
              onClick={() => {
                onSelect(n.id);
                setOpen(false);
              }}
              type="button"
            >
              <p className="font-medium text-[color:var(--almanac-ink)]">{n.title}</p>
              <p className="line-clamp-1 text-[color:var(--almanac-ink-soft)]">{n.body}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
