"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import {
  addAdminDocumentInstruction,
  addAdminTextInstruction,
  deleteAdminInstruction,
  listAdminInstructions,
} from "@/app/dashboard/actions";
import type { AdminInstruction } from "@/lib/types";

/**
 * Admin-only Settings panel for the global AI instructions. It self-gates: on
 * mount it asks the server whether the current user is an administrator and
 * renders nothing for everyone else, so it is safe to drop into the shared
 * preferences popup without threading an `isAdmin` prop through the tree.
 */
export function AdminInstructionsSection() {
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<AdminInstruction[]>([]);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await listAdminInstructions();
    setIsAdmin(res.isAdmin);
    setItems(res.items);
    setReady(true);
  }

  useEffect(() => {
    // Initial load of the admin instruction list. State updates happen after an
    // await, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  if (!ready || !isAdmin) return null;

  function saveText() {
    setError(null);
    startTransition(async () => {
      const res = await addAdminTextInstruction({ title, content });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTitle("");
      setContent("");
      await refresh();
    });
  }

  function saveDocument() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF, DOCX, or TXT file first.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    if (docTitle) fd.set("title", docTitle);
    startTransition(async () => {
      const res = await addAdminDocumentInstruction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDocTitle("");
      if (fileRef.current) fileRef.current.value = "";
      await refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      await deleteAdminInstruction(id);
      await refresh();
    });
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.82rem] text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]";
  const saveBtnClass =
    "h-9 rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-70";

  return (
    <details className="border-t border-[color:var(--almanac-rule)] py-3.5">
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
        <span>AI instructions (Admin)</span>
        <span className="rounded-full bg-[color:var(--almanac-butter)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--almanac-ink)]">
          Admin
        </span>
      </summary>

      <div className="mt-3 grid gap-3">
        <p className="text-[0.72rem] leading-5 text-[color:var(--almanac-ink-soft)]">
          Guidance added here is sent to every student&rsquo;s AI (chat and voice
          coach).
        </p>

        {/* Existing instructions */}
        {items.length > 0 ? (
          <ul className="grid gap-1.5">
            {items.map((item) => (
              <li
                className="flex items-start justify-between gap-2 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2"
                key={item.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-[0.78rem] font-medium text-[color:var(--almanac-ink)]">
                    {item.title || item.file_name || "Instruction"}
                    <span className="ml-1.5 text-[0.62rem] uppercase tracking-wide text-[color:var(--almanac-ink-soft)]">
                      {item.source}
                    </span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.72rem] leading-4 text-[color:var(--almanac-ink-soft)]">
                    {item.content}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-md px-2 py-1 text-[0.68rem] font-medium text-[color:var(--almanac-clay)] hover:underline disabled:opacity-50"
                  disabled={pending}
                  onClick={() => remove(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.72rem] text-[color:var(--almanac-ink-soft)]">
            No instructions yet.
          </p>
        )}

        {/* Paste text */}
        <div className="grid gap-1.5 border-t border-[color:var(--almanac-rule)] pt-3">
          <span className="text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
            Add written guidance
          </span>
          <input
            className={inputClass}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Label (optional)"
            value={title}
          />
          <textarea
            className="min-h-20 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-[0.82rem] leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
            onChange={(e) => setContent(e.target.value)}
            placeholder="e.g. Always reference our school's IB program and emphasize service hours."
            value={content}
          />
          <button
            className={saveBtnClass}
            disabled={pending || content.trim().length < 2}
            onClick={saveText}
            type="button"
          >
            {pending ? "Saving…" : "Save instruction"}
          </button>
        </div>

        {/* Upload document */}
        <div className="grid gap-1.5 border-t border-[color:var(--almanac-rule)] pt-3">
          <span className="text-[0.72rem] font-medium text-[color:var(--almanac-ink-soft)]">
            Upload a document (PDF, DOCX, TXT)
          </span>
          <input
            className={inputClass}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="Label (optional)"
            value={docTitle}
          />
          <input
            accept=".pdf,.docx,.txt,.md"
            className="text-[0.75rem] text-[color:var(--almanac-ink-soft)] file:mr-3 file:rounded-md file:border file:border-[color:var(--almanac-rule)] file:bg-[color:var(--almanac-paper)] file:px-2 file:py-1 file:text-[0.72rem] file:text-[color:var(--almanac-ink)]"
            ref={fileRef}
            type="file"
          />
          <button
            className={saveBtnClass}
            disabled={pending}
            onClick={saveDocument}
            type="button"
          >
            {pending ? "Uploading…" : "Upload document"}
          </button>
        </div>

        {error ? (
          <p className="text-[0.72rem] text-[color:var(--almanac-clay)]">{error}</p>
        ) : null}
      </div>
    </details>
  );
}
