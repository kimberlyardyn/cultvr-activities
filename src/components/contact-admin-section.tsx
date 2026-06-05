"use client";

import { useRef, useState, useTransition } from "react";

import { submitFeedback } from "@/app/dashboard/actions";
import { toast } from "@/components/toast";

/**
 * Settings panel that lets a student contact the admin with questions or
 * feedback, optionally attaching screenshots / PDFs of issues they hit.
 */
const CATEGORIES = [
  { id: "question", label: "Question" },
  { id: "bug", label: "Bug / issue" },
  { id: "feedback", label: "Feedback" },
  { id: "other", label: "Other" },
] as const;

export function ContactAdminSection() {
  const [category, setCategory] = useState<string>("question");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setFiles((prev) => [...prev, ...Array.from(picked)].slice(0, 5));
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function submit() {
    if (message.trim().length < 5) {
      toast.error("Please add a bit more detail first.");
      return;
    }
    const fd = new FormData();
    fd.set("category", category);
    fd.set("message", message);
    for (const f of files) fd.append("attachments", f);

    startTransition(async () => {
      try {
        const res = await submitFeedback(fd);
        if (res.ok) {
          toast.success("Message sent — thank you! We'll take a look.");
          setMessage("");
          setFiles([]);
          setCategory("question");
          if (fileRef.current) fileRef.current.value = "";
        } else {
          toast.error(res.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send message.");
      }
    });
  }

  return (
    <details className="border-t border-[color:var(--almanac-rule)] py-3.5">
      <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
        Contact us
      </summary>

      <div className="mt-3 grid gap-3">
        <p className="text-[0.72rem] leading-5 text-[color:var(--almanac-ink-soft)]">
          Have a question, found a bug, or want to share feedback? Send us a note —
          attach screenshots or PDFs if it helps explain the issue.
        </p>

        {/* Category */}
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              className={[
                "rounded-lg border px-2.5 py-1.5 text-[0.74rem] font-medium transition",
                category === c.id
                  ? "border-[color:var(--almanac-ink)] bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                  : "border-[color:var(--almanac-rule)] text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
              ].join(" ")}
              key={c.id}
              onClick={() => setCategory(c.id)}
              type="button"
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Message */}
        <textarea
          className="min-h-24 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-[0.82rem] leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
          maxLength={5000}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your question or the issue you're running into…"
          value={message}
        />

        {/* Attachments */}
        <div className="grid gap-2">
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--almanac-rule)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--almanac-ink)] transition hover:bg-black/5">
            Attach screenshots or PDFs
            <input
              accept="image/*,.pdf"
              className="sr-only"
              multiple
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
              ref={fileRef}
              type="file"
            />
          </label>

          {files.length > 0 && (
            <ul className="grid gap-1">
              {files.map((f, i) => (
                <li
                  className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-2.5 py-1.5 text-[0.7rem] text-[color:var(--almanac-ink)]"
                  key={`${f.name}-${i}`}
                >
                  <span className="min-w-0 truncate">
                    {f.name}{" "}
                    <span className="text-[color:var(--almanac-ink-soft)]">
                      ({Math.round(f.size / 1024)} KB)
                    </span>
                  </span>
                  <button
                    aria-label={`Remove ${f.name}`}
                    className="shrink-0 rounded px-1.5 text-[color:var(--almanac-clay)] hover:underline"
                    onClick={() => removeFile(i)}
                    type="button"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.65rem] text-[color:var(--almanac-ink-soft)]">
            Up to 5 files, 10 MB each.
          </p>
        </div>

        <button
          className="h-9 rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-60"
          disabled={pending || message.trim().length < 5}
          onClick={submit}
          type="button"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </div>
    </details>
  );
}
