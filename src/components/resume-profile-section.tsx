"use client";

import { useEffect, useState, useTransition } from "react";

import { getResumeProfile, updateResumeProfile } from "@/app/dashboard/actions";
import { toast } from "@/components/toast";

/**
 * Settings panel for the résumé header — the personal/contact details that
 * appear at the top of an exported resume. Loads the saved values on mount.
 */
export function ResumeProfileSection() {
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState("");
  const [summary, setSummary] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const data = await getResumeProfile();
      if (data) {
        setFullName(data.full_name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setLocation(data.location ?? "");
        setLinks(data.links ?? "");
        setSummary(data.summary ?? "");
      }
      setReady(true); // eslint-disable-line react-hooks/set-state-in-effect
    })();
  }, []);

  function save() {
    startTransition(async () => {
      const res = await updateResumeProfile({
        fullName,
        email,
        phone,
        location,
        links,
        summary,
      });
      if (res.ok) toast.success("Resume header saved.");
      else toast.error(res.error);
    });
  }

  const inputClass =
    "h-9 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.82rem] text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]";

  return (
    <details className="border-t border-[color:var(--almanac-rule)] py-3.5">
      <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
        Resume header
      </summary>

      <div className="mt-3 grid gap-2.5">
        <p className="text-[0.72rem] leading-5 text-[color:var(--almanac-ink-soft)]">
          These details appear at the top of your exported resume. Optional — leave
          blank to skip.
        </p>

        {!ready ? (
          <p className="text-[0.72rem] text-[color:var(--almanac-ink-soft)]">Loading…</p>
        ) : (
          <>
            <Labeled label="Full name">
              <input
                className={inputClass}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                value={fullName}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Email">
                <input
                  className={inputClass}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@email.com"
                  value={email}
                />
              </Labeled>
              <Labeled label="Phone">
                <input
                  className={inputClass}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  value={phone}
                />
              </Labeled>
            </div>
            <Labeled label="Location">
              <input
                className={inputClass}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, State"
                value={location}
              />
            </Labeled>
            <Labeled label="Links">
              <input
                className={inputClass}
                onChange={(e) => setLinks(e.target.value)}
                placeholder="linkedin.com/in/jane · github.com/jane"
                value={links}
              />
            </Labeled>
            <Labeled label="Summary (optional)">
              <textarea
                className="min-h-16 resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-[0.82rem] leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two lines summarizing who you are."
                value={summary}
              />
            </Labeled>

            <button
              className="h-9 rounded-lg bg-[color:var(--almanac-ink)] px-3 text-[0.75rem] font-medium text-[color:var(--almanac-paper)] transition disabled:opacity-60"
              disabled={pending}
              onClick={save}
              type="button"
            >
              {pending ? "Saving…" : "Save resume header"}
            </button>
          </>
        )}
      </div>
    </details>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[0.7rem] font-medium text-[color:var(--almanac-ink-soft)]">
        {label}
      </span>
      {children}
    </label>
  );
}
