"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { getResumeProfile, updateResumeProfile } from "@/app/dashboard/actions";
import { toast } from "@/components/toast";

/** Education row as edited in the form — all fields are strings here; the
 *  server trims them and drops rows with no school. `_key` is a client-only id
 *  so add/remove stays stable without reordering glitches. */
type EduRow = {
  _key: string;
  school: string;
  degree: string;
  location: string;
  graduation: string;
  gpa: string;
  details: string;
};

function blankEdu(): EduRow {
  return {
    _key: crypto.randomUUID(),
    school: "",
    degree: "",
    location: "",
    graduation: "",
    gpa: "",
    details: "",
  };
}

/**
 * Settings panel for the résumé header — the personal/contact details, the
 * Education section (multiple schools), and Skills/Interests that appear on an
 * exported resume. Loads the saved values on mount and saves everything in one
 * upsert.
 */
export function ResumeProfileSection() {
  const [ready, setReady] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState("");
  const [summary, setSummary] = useState("");
  const [education, setEducation] = useState<EduRow[]>([]);
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
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
        setEducation(
          (data.education ?? []).map((e) => ({
            _key: crypto.randomUUID(),
            school: e.school ?? "",
            degree: e.degree ?? "",
            location: e.location ?? "",
            graduation: e.graduation ?? "",
            gpa: e.gpa ?? "",
            details: e.details ?? "",
          })),
        );
        setSkills(data.skills ?? "");
        setInterests(data.interests ?? "");
      }
      setReady(true);
    })();
  }, []);

  function setEduField(key: string, field: keyof Omit<EduRow, "_key">, val: string) {
    setEducation((rows) => rows.map((r) => (r._key === key ? { ...r, [field]: val } : r)));
  }

  function save() {
    startTransition(async () => {
      const res = await updateResumeProfile({
        fullName,
        email,
        phone,
        location,
        links,
        summary,
        education: education.map((e) => ({
          school: e.school,
          degree: e.degree,
          location: e.location,
          graduation: e.graduation,
          gpa: e.gpa,
          details: e.details,
        })),
        skills,
        interests,
      });
      if (res.ok) toast.success("Resume header saved.");
      else toast.error(res.error);
    });
  }

  return (
    <details className="border-t border-[color:var(--almanac-rule)] py-3.5">
      <summary className="cursor-pointer list-none text-[0.88rem] font-medium text-[color:var(--almanac-ink)]">
        Resume header
      </summary>

      <div className="mt-3 grid gap-2.5">
        <p className="text-[0.72rem] leading-5 text-[color:var(--almanac-ink-soft)]">
          These details appear at the top and bottom of your exported resume.
          Optional — leave blank to skip.
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
                className={textareaClass}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One or two lines summarizing who you are."
                value={summary}
              />
            </Labeled>

            {/* Education — multiple schools (transfers, college, summer programs). */}
            <Section title="Education">
              <p className="text-[0.7rem] leading-4 text-[color:var(--almanac-ink-soft)]">
                Add each school you’ve attended — transfers, college, or summer
                programs. Use “Honors & coursework” for AP/IB courses, Dean’s
                List, or relevant coursework.
              </p>

              {education.map((row, i) => (
                <div
                  className="grid gap-2 rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-3"
                  key={row._key}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[color:var(--almanac-ink-soft)]">
                      School {i + 1}
                    </span>
                    <button
                      className="rounded-full p-1 text-[color:var(--almanac-ink-soft)] transition hover:bg-black/5 hover:text-[color:var(--almanac-ink)]"
                      onClick={() =>
                        setEducation((rows) => rows.filter((r) => r._key !== row._key))
                      }
                      title="Remove school"
                      type="button"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <Labeled label="School name">
                    <input
                      className={inputClass}
                      onChange={(e) => setEduField(row._key, "school", e.target.value)}
                      placeholder="Lincoln High School"
                      value={row.school}
                    />
                  </Labeled>
                  <div className="grid grid-cols-2 gap-2">
                    <Labeled label="Degree / program">
                      <input
                        className={inputClass}
                        onChange={(e) => setEduField(row._key, "degree", e.target.value)}
                        placeholder="High School Diploma"
                        value={row.degree}
                      />
                    </Labeled>
                    <Labeled label="Location">
                      <input
                        className={inputClass}
                        onChange={(e) => setEduField(row._key, "location", e.target.value)}
                        placeholder="City, State"
                        value={row.location}
                      />
                    </Labeled>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Labeled label="Graduation">
                      <input
                        className={inputClass}
                        onChange={(e) => setEduField(row._key, "graduation", e.target.value)}
                        placeholder="Expected May 2026"
                        value={row.graduation}
                      />
                    </Labeled>
                    <Labeled label="GPA">
                      <input
                        className={inputClass}
                        onChange={(e) => setEduField(row._key, "gpa", e.target.value)}
                        placeholder="3.8"
                        value={row.gpa}
                      />
                    </Labeled>
                  </div>
                  <p className="-mt-1 text-[0.64rem] text-[color:var(--almanac-ink-soft)]">
                    Tip: include GPA only if it’s 3.0 or higher.
                  </p>
                  <Labeled label="Honors & coursework (optional)">
                    <textarea
                      className={textareaClass}
                      onChange={(e) => setEduField(row._key, "details", e.target.value)}
                      placeholder="AP Calculus BC, IB Diploma, Dean’s List, relevant coursework…"
                      value={row.details}
                    />
                  </Labeled>
                </div>
              ))}

              <button
                className="inline-flex w-fit items-center gap-1 rounded-lg border border-dashed border-[color:var(--almanac-rule)] px-3 py-1.5 text-[0.72rem] font-medium text-[color:var(--almanac-ink)] transition hover:bg-[color:var(--almanac-paper-deep)]"
                onClick={() => setEducation((rows) => [...rows, blankEdu()])}
                type="button"
              >
                <Plus size={12} />
                Add school
              </button>
            </Section>

            {/* Skills & interests — shown at the bottom of the resume. */}
            <Section title="Skills & interests">
              <Labeled label="Skills (optional)">
                <textarea
                  className={textareaClass}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Python, Spanish (fluent), public speaking, Adobe Photoshop…"
                  value={skills}
                />
              </Labeled>
              <Labeled label="Interests (optional)">
                <textarea
                  className={textareaClass}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Rock climbing, jazz piano, marine biology, chess…"
                  value={interests}
                />
              </Labeled>
            </Section>

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

const inputClass =
  "h-9 w-full rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 text-[0.82rem] text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]";

const textareaClass =
  "min-h-16 w-full resize-y rounded-lg border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-3 py-2 text-[0.82rem] leading-5 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5 grid gap-2.5 border-t border-[color:var(--almanac-rule)] pt-3">
      <p className="text-[0.8rem] font-medium text-[color:var(--almanac-ink)]">{title}</p>
      {children}
    </div>
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
