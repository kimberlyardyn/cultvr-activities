"use client";

import {
  Briefcase,
  Calendar,
  ExternalLink,
  Network,
  Users,
} from "lucide-react";
import { useState, type ComponentType } from "react";

type Resource = {
  /** Display title (the org / tool name). */
  title: string;
  /** 1–2 line plain-language summary of what the resource does. */
  description: string;
  /** External destination — opens in a new tab. */
  url: string;
  /** Optional sub-label rendered as a small pill (e.g. "Free", "Quiz"). */
  badge?: string;
};

type TabDef = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
  blurb: string;
  /** Flat list of resources for tabs that don't need subgrouping. */
  resources?: Resource[];
  /** Optional grouped layout — each section renders with its own heading. */
  sections?: { title: string; resources: Resource[] }[];
};

const TABS: TabDef[] = [
  // -----------------------------------------------------------------------
  // 1) College Applications — applications + deadlines + key research tools.
  // -----------------------------------------------------------------------
  {
    id: "applications",
    label: "College Applications",
    icon: Calendar,
    color: "#4e5b7a",
    blurb:
      "Application Portals, College Research, and Deadlines.",
    resources: [
      // --- Applications & deadlines ---
      {
        title: "Common App",
        description:
          "The standard application portal used by 1,000+ colleges. Start here for most U.S. schools.",
        url: "https://www.commonapp.org",
        badge: "Application",
      },
      {
        title: "University of California Application",
        description:
          "The shared application for all 9 UC campuses. Opens August 1, due November 30.",
        url: "https://apply.universityofcalifornia.edu/",
        badge: "Application",
      },
      {
        title: "Common App: Deadline tracker",
        description:
          "Filter every Common App school by deadline (EA, ED, ED2, Regular, Rolling).",
        url: "https://apply.commonapp.org/explore",
        badge: "Deadlines",
      },

      // --- College research / fit ---
      {
        title: "BigFuture (College Board)",
        description:
          "Free, comprehensive school search with detailed profiles, costs, and majors offered.",
        url: "https://bigfuture.collegeboard.org",
        badge: "Research",
      },
      {
        title: "Niche",
        description:
          "Student-written reviews, rankings, acceptance data, and campus-life signal.",
        url: "https://www.niche.com/colleges/",
        badge: "Research",
      },
      {
        title: "CollegeData",
        description:
          "Deep applicant data: GPA/test ranges, admit rates by category, yield, and net price.",
        url: "https://www.collegedata.com/",
        badge: "Research",
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 2) Majors & Careers
  // -----------------------------------------------------------------------
  {
    id: "majors",
    label: "Majors & Careers",
    icon: Briefcase,
    color: "#9b7ab8",
    blurb:
      "Explore academic majors, what graduates actually do, and where careers lead.",
    sections: [
      {
        title: "Majors",
        resources: [
          {
            title: "BigFuture Major & Career Search",
            description:
              "Browse hundreds of majors with median salaries, related careers, and which schools offer them.",
            url: "https://bigfuture.collegeboard.org/explore-careers",
            badge: "Free",
          },
          {
            title: "MyMajors Quiz",
            description:
              "Free assessment that suggests majors based on interests and abilities.",
            url: "https://www.mymajors.com/",
            badge: "Quiz",
          },
          {
            title: "What Can I Do With This Major?",
            description:
              "Maps each major to common career paths, employer types, and skills built.",
            url: "https://whatcanidowiththismajor.com/info.php",
          },
          {
            title: "LinkedIn Field of Study Explorer",
            description:
              "See where graduates of a specific major ended up — companies, roles, and grad schools.",
            url: "https://www.linkedin.com/school/fieldofstudy/",
          },
          {
            title: "Princeton Review: Major Profiles",
            description:
              "In-depth profiles of popular majors — what you'll study, what skills you build, and where graduates go.",
            url: "https://www.princetonreview.com/college-advice/college-majors",
          },
          {
            title: "PayScale College Salary Report",
            description:
              "Majors ranked by early- and mid-career salary, with role data for each one.",
            url: "https://www.payscale.com/college-salary-report/majors",
            badge: "Data",
          },
        ],
      },
      {
        title: "Careers",
        resources: [
          {
            title: "BLS Occupational Outlook Handbook",
            description:
              "Government data on what each job is, what it pays, education needed, and growth outlook.",
            url: "https://www.bls.gov/ooh/",
            badge: "Free",
          },
          {
            title: "Roadtrip Nation",
            description:
              "Video interviews with professionals across hundreds of fields — great for exploration.",
            url: "https://roadtripnation.com/",
            badge: "Free",
          },
          {
            title: "CareerExplorer",
            description:
              "Free interest + personality assessment that matches you to specific careers with detailed profiles.",
            url: "https://www.careerexplorer.com/",
            badge: "Quiz",
          },
          {
            title: "LinkedIn Career Explorer",
            description:
              "Discover roles based on your existing skills, see what's missing, and chart a career path.",
            url: "https://linkedin.github.io/career-explorer/",
          },
        ],
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 6) Networking & Mentorship
  // -----------------------------------------------------------------------
  {
    id: "networking",
    label: "Networking",
    icon: Network,
    color: "#5b8fa8",
    blurb:
      "Build a professional presence and find people who can answer your real questions.",
    resources: [
      {
        title: "LinkedIn",
        description:
          "Set up a clean student profile now. Useful for alumni connections, internships, and recommendations.",
        url: "https://www.linkedin.com/",
      },
      {
        title: "LinkedIn Alumni Tool",
        description:
          "Search alumni of any college by major, employer, location, or graduation year.",
        url: "https://www.linkedin.com/school/",
      },
      {
        title: "ProFellow",
        description:
          "Searchable database of 2,500+ fellowships and funding opportunities for students.",
        url: "https://www.profellow.com/",
      },
      {
        title: "Handshake",
        description:
          "Career platform connecting students with internships and entry-level jobs.",
        url: "https://joinhandshake.com/students/",
      },
      {
        title: "iCouldBe",
        description:
          "Online mentorship platform pairing students with professionals.",
        url: "https://www.icouldbe.org/",
      },
      {
        title: "CareerVillage",
        description:
          "Free Q&A platform — post real career questions and get answers from working professionals.",
        url: "https://www.careervillage.org/",
        badge: "Free",
      },
    ],
  },

  // -----------------------------------------------------------------------
  // 7) Coaching — career coaching + private admissions partners.
  // -----------------------------------------------------------------------
  {
    id: "counseling",
    label: "Coaching",
    icon: Users,
    color: "#c4697a",
    blurb:
      "Career coaching and private college admissions partners.",
    resources: [
      // --- Career counseling / coaching ---
      {
        title: "The Muse — Coaching",
        description:
          "Marketplace of vetted career coaches plus a deep library of career guidance articles.",
        url: "https://www.themuse.com/coaching",
        badge: "Career",
      },
      // --- Private college admissions partners ---
      {
        title: "Savant Seal",
        description:
          "Strategic college admissions consulting focused on long-form storytelling, application strategy, and standout positioning.",
        url: "https://www.savantseal.com",
        badge: "Partner · Admissions",
      },
      {
        title: "Bonday Education",
        description:
          "Personalized academic mentorship and college planning, including STEM-focused enrichment.",
        url: "https://www.bonday.com/",
        badge: "Partner · Admissions",
      },
    ],
  },
];

export function DiscoverView() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0].id);
  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-b border-[color:var(--almanac-rule)] px-5 pb-5 pt-6 md:px-9">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--almanac-ink-soft)]">
          Curated for you
        </p>
        <h1 className="mt-2 font-serif text-4xl leading-[1.05] text-[color:var(--almanac-ink)] md:text-5xl">
          <em className="italic text-[color:var(--almanac-sage,#7a9e7a)]">Discover</em>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
          Discover where to apply, explore new careers and directions, and receive personalized mentorship. Every card opens directly to the source — no detours.
        </p>
      </header>

      {/* Tab strip */}
      <div className="overflow-x-auto px-5 pt-4 md:px-9">
        <div className="inline-flex max-w-full gap-2">
          {TABS.map((t) => {
            const active = t.id === activeTab;
            const Icon = t.icon;
            return (
              <button
                className={[
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                  active
                    ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                    : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                ].join(" ")}
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                type="button"
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-9">
        {/* Tab intro */}
        <div className="mb-5 flex items-start gap-3">
          <span
            className="mt-1 inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: tab.color }}
          />
          <div>
            <h2 className="font-serif text-2xl leading-tight text-[color:var(--almanac-ink)]">
              {tab.label}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              {tab.blurb}
            </p>
          </div>
        </div>

        {tab.sections ? (
          <div className="grid gap-6">
            {tab.sections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 font-serif text-lg leading-tight text-[color:var(--almanac-ink)]">
                  {section.title}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {section.resources.map((r) => (
                    <ResourceCard key={r.url} resource={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(tab.resources ?? []).map((r) => (
              <ResourceCard key={r.url} resource={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      className="group flex flex-col gap-2 rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(31,36,51,0.08)]"
      href={resource.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-xl leading-tight text-[color:var(--almanac-ink)]">
          {resource.title}
        </h3>
        <ExternalLink
          className="mt-1 shrink-0 text-[color:var(--almanac-ink-soft)] transition group-hover:text-[color:var(--almanac-ink)]"
          size={14}
        />
      </header>

      <p className="text-sm leading-5 text-[color:var(--almanac-ink-soft)]">
        {resource.description}
      </p>

      <footer className="mt-1">
        <span className="truncate text-[0.7rem] text-[color:var(--almanac-ink-soft)]">
          {hostname(resource.url)}
        </span>
      </footer>
    </a>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
