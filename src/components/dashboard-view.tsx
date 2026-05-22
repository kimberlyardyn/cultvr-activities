"use client";

import { BookOpen, GraduationCap, ListTodo, Mic, Plus, School, Sparkles } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  createCollegeListEntry,
  updateCollegeListEntry,
} from "@/app/dashboard/actions";
import {
  dashboardDemo,
  type ActivityPipelineItem,
  type CollegeListItem,
  type DashboardModel,
  type DashboardTab,
  type EssaySeed,
  type KnowledgeGraph,
  type KnowledgeGraphNode,
  type ProfileDepth,
  type ProfileDepthBreakdown,
  type ReadinessArea,
  type ReflectionCard,
  type StorySignal,
  type WeeklyAction,
} from "@/components/dashboard-model";
import type {
  Activity,
  Award,
  CollegeListEntry,
  Goal,
  GuidedSession,
  Note,
  StudentTask,
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

type DashboardViewProps = {
  awards: Award[];
  firstName: string;
  goals: Goal[];
  guidedSessions: GuidedSession[];
  notes: Note[];
  onNavigateTab?: (tab: "sessions" | "action-plan") => void;
  tasks: StudentTask[];
  activities: Activity[];
  collegeList: CollegeListEntry[];
};

const tabs: Array<{ id: DashboardTab; label: string; icon: typeof Sparkles }> = [
  { id: "continue", label: "Workspace", icon: Sparkles },
  { id: "story-activities", label: "Story & Activities", icon: BookOpen },
  { id: "weekly-plan", label: "Weekly Plan", icon: ListTodo },
  { id: "college-list", label: "College List", icon: School },
  { id: "application-readiness", label: "Application Readiness", icon: GraduationCap },
];

const collegeStatuses = [
  "Interested",
  "Researching",
  "Likely",
  "Target",
  "Reach",
  "Applying",
  "Archived",
] as const;

const collegePriorities = ["High", "Medium", "Low"] as const;

export function DashboardView({
  awards,
  firstName,
  goals,
  guidedSessions,
  notes,
  onNavigateTab,
  tasks,
  activities,
  collegeList,
}: DashboardViewProps) {
  const model = useMemo(
    () =>
      buildDashboardModel({
        awards,
        goals,
        guidedSessions,
        notes,
        tasks,
        activities,
        collegeList,
      }),
    [activities, awards, collegeList, goals, guidedSessions, notes, tasks],
  );
  const [activeTab, setActiveTab] = useState<DashboardTab>("continue");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        title={
          <>
            Your{" "}
            <em className="font-serif italic text-[color:var(--almanac-butter)]">
              workspace
            </em>
          </>
        }
      />

      <div className="px-5 pt-5 md:px-9">
        <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                className={[
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                  active
                    ? "bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]"
                    : "text-[color:var(--almanac-ink-soft)] hover:text-[color:var(--almanac-ink)]",
                ].join(" ")}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-9">
        {activeTab === "continue" ? (
          <ContinueTab
            firstName={firstName}
            model={model}
            onNavigateTab={onNavigateTab}
          />
        ) : null}
        {activeTab === "story-activities" ? <StoryActivitiesTab model={model} /> : null}
        {activeTab === "weekly-plan" ? (
          <WeeklyPlanTab model={model} onNavigateTab={onNavigateTab} />
        ) : null}
        {activeTab === "college-list" ? <CollegeListTab model={model} /> : null}
        {activeTab === "application-readiness" ? <ReadinessTab model={model} /> : null}
      </div>
    </div>
  );
}

function ContinueTab({
  firstName,
  model,
  onNavigateTab,
}: {
  firstName: string;
  model: DashboardModel;
  onNavigateTab?: (tab: "sessions" | "action-plan") => void;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <section className="w-full rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)] md:p-6">
        <h2 className="max-w-3xl font-serif text-4xl leading-[1.02] md:text-5xl">
          Welcome back,{" "}
          <em className="italic text-[color:var(--almanac-butter)]">
            {firstName}
          </em>
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/70">
          Continue where you left off.
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
          {model.continuePanel.heroSummary}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <PrimaryButton onClick={() => onNavigateTab?.("sessions")}>
            <Mic size={15} />
            Start session
          </PrimaryButton>
        </div>
      </section>

      <ProfileDepthOverview depth={model.profileDepth} />

      <KnowledgeGraphPanel graph={model.knowledgeGraph} />
    </div>
  );
}

function StoryActivitiesTab({ model }: { model: DashboardModel }) {
  return (
    <div className="grid gap-5">
      <Section
        kicker="Story signals"
        title="Patterns starting to appear"
        description="These are the themes to keep testing in future reflections."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {model.storySignals.map((signal) => (
            <SignalCard key={signal.label} signal={signal} />
          ))}
        </div>
      </Section>

      <div className="grid gap-5">
        <Section kicker="Reflection library" title="Recent reflection notes">
          <div className="grid gap-3">
            {model.reflections.map((reflection) => (
              <ReflectionRow key={reflection.id} reflection={reflection} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function WeeklyPlanTab({
  model,
  onNavigateTab,
}: {
  model: DashboardModel;
  onNavigateTab?: (tab: "sessions" | "action-plan") => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Section
        kicker="Weekly plan"
        title="Small actions that move the application forward"
        description="The plan stays practical: short reflections, cleaner activity lines, and concrete follow-ups."
      >
        <div className="grid gap-3">
          {model.weeklyActions.map((action) => (
            <WeeklyActionRow
              action={action}
              key={action.title}
              onStart={() => onNavigateTab?.("sessions")}
            />
          ))}
        </div>
      </Section>

      <aside className="grid gap-4 self-start">
        <Section kicker="Completed" title="This week">
          <div className="grid gap-2">
            {model.completedThisWeek.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </Section>
        <SmallPanel label="Suggested next voice prompt">
          {model.continuePanel.recommendedPrompt}
        </SmallPanel>
      </aside>
    </div>
  );
}

function CollegeListTab({ model }: { model: DashboardModel }) {
  const hasColleges = model.collegeList.length > 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Section
        kicker="College list"
        title="Schools worth tracking"
        description="Keep fit notes tied to what comes up in sessions, not just rankings."
      >
        {hasColleges ? (
          <div className="grid gap-3">
            {model.collegeList.map((college) => (
              <CollegeCard college={college} key={college.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5">
            <h3 className="font-serif text-2xl leading-tight">Start with one school you are curious about.</h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
              Add the school and one honest reason it might fit. Later, guided sessions can update this list when a college comes up in conversation.
            </p>
          </div>
        )}
      </Section>

      <aside className="grid gap-4 self-start">
        <CollegeListForm />
        <SmallPanel label="Conversation updates">
          When a session mentions a college, fit preference, major, location, or program type, it can be saved here as a school note.
        </SmallPanel>
      </aside>
    </div>
  );
}

function ReadinessTab({ model }: { model: DashboardModel }) {
  return (
    <div className="grid gap-5">
      <Section
        kicker="Readiness overview"
        title="How close the student is to application-ready material"
        description="This view maps reflection work to actual admissions outputs."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {model.readinessAreas.map((area) => (
            <ReadinessCard area={area} key={area.label} />
          ))}
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section kicker="Common App" title="Activities and essay direction">
          <div className="grid gap-3">
            <ReadinessLine label="Activities drafted" value={`${model.commonAppReadiness.drafted} / 10`} />
            <ReadinessLine label="Application-ready" value={`${model.commonAppReadiness.ready}`} />
            <ReadinessLine
              label="Need stronger impact"
              value={`${model.commonAppReadiness.needsStrongerImpact}`}
            />
            <div className="flex flex-wrap gap-2">
              {model.commonAppReadiness.missingCategories.map((item) => (
                <Pill key={item}>{item}</Pill>
              ))}
            </div>
          </div>
        </Section>

        <Section kicker="UC readiness" title="Categories to strengthen">
          <div className="grid gap-3">
            <ReadinessLine label="Activities & awards" value={model.ucReadiness.activitiesAndAwards} />
            <ReadinessLine label="Leadership" value={model.ucReadiness.leadership} />
            <ReadinessLine label="Education prep" value={model.ucReadiness.educationalPreparation} />
            <ReadinessLine label="Service" value={model.ucReadiness.volunteering} />
          </div>
        </Section>
      </div>

      <Section kicker="Profile diagnosis" title="Counselor read">
        <div className="grid gap-4 lg:grid-cols-3">
          <DiagnosisList label="Strengths" items={model.profileDiagnosis.strengths} />
          <DiagnosisList label="Needs work" items={model.profileDiagnosis.needsWork} />
          <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-ink)] p-5 text-[color:var(--almanac-paper)]">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Next action</p>
            <p className="mt-3 text-sm leading-6 text-white/82">
              {model.profileDiagnosis.nextAction}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function PageHeader({
  title,
}: {
  title: ReactNode;
}) {
  return (
    <header className="border-b border-[color:var(--almanac-rule)] px-5 py-6 md:px-9 md:py-8">
      <div className="max-w-5xl">
        <h1 className="font-serif text-4xl leading-[1.02] text-[color:var(--almanac-ink)] md:text-5xl">
          {title}
        </h1>
      </div>
    </header>
  );
}

function Section({
  children,
  description,
  kicker,
  title,
}: {
  children: ReactNode;
  description?: string;
  kicker: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5 md:p-6">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
        {kicker}
      </p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-[color:var(--almanac-ink)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
          {description}
        </p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SmallPanel({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink)]">{children}</p>
    </section>
  );
}

function ProfileDepthOverview({ depth }: { depth: ProfileDepth }) {
  return (
    <section className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5 md:p-6">
      <div className="grid items-center gap-7 md:grid-cols-[15rem_1fr]">
        <div className="relative mx-auto size-52">
          <ProgressRings rings={depth.breakdown} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-4xl leading-none text-[color:var(--almanac-ink)]">
              {depth.value}%
            </p>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
              Profile depth
            </p>
          </div>
        </div>
        <div>
          <div className="mt-3 grid gap-3">
            {depth.breakdown.map((item) => {
              const progress = Math.min((item.current / item.goal) * 100, 100);

              return (
                <div className="flex items-center gap-4" key={item.label}>
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-serif text-xl italic leading-tight text-[color:var(--almanac-ink)]">
                        {item.label}
                      </p>
                      <p className="text-xs text-[color:var(--almanac-ink-soft)]">
                        {item.current} of {item.goal} - {item.note}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: item.color,
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressRings({ rings }: { rings: ProfileDepthBreakdown[] }) {
  const size = 200;
  const ringWidth = 14;
  const radii = [88, 66, 44];

  return (
    <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring, index) => {
        const radius = radii[index] ?? 44;
        const circumference = 2 * Math.PI * radius;
        const value = Math.min(ring.current / ring.goal, 1);

        return (
          <g key={ring.label} transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
            <circle
              fill="none"
              r={radius}
              stroke={ring.color}
              strokeOpacity="0.18"
              strokeWidth={ringWidth}
            />
            <circle
              fill="none"
              r={radius}
              stroke={ring.color}
              strokeDasharray={`${circumference * value} ${circumference}`}
              strokeLinecap="round"
              strokeWidth={ringWidth}
            />
          </g>
        );
      })}
    </svg>
  );
}

function KnowledgeGraphPanel({ graph }: { graph: KnowledgeGraph }) {
  const positionedNodes = layoutGraphNodes(graph.nodes);
  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));

  return (
    <section className="overflow-hidden rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-4 md:p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[color:var(--almanac-ink-soft)]">
            Knowledge graph
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight text-[color:var(--almanac-ink)]">
            What keeps coming up
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-[color:var(--almanac-ink-soft)]">
          Patterns emerging from your sessions and notes.
        </p>
      </div>

      <div className="mt-4 h-56 overflow-hidden rounded-2xl border border-white/10 bg-[#050728] p-2 shadow-inner">
          <svg className="h-full w-full" viewBox="0 0 760 230" role="img" aria-label="Session keyword knowledge graph">
            <defs>
              <filter id="knowledge-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {graph.links.map((link) => {
              const source = nodeMap.get(link.source);
              const target = nodeMap.get(link.target);
              if (!source || !target) return null;
              const midpointX = (source.x + target.x) / 2;
              const midpointY = (source.y + target.y) / 2 - 24;
              return (
                <path
                  d={`M ${source.x} ${source.y} Q ${midpointX} ${midpointY} ${target.x} ${target.y}`}
                  key={`${link.source}-${link.target}`}
                  fill="none"
                  stroke="rgba(236,242,255,0.48)"
                  strokeLinecap="round"
                  strokeWidth={Math.max(0.7, link.strength / 42)}
                />
              );
            })}
            {positionedNodes.map((node) => {
              const isHub = node.kind === "theme";
              const radius = isHub ? 6.5 + node.strength / 24 : 4.5 + node.strength / 34;
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    fill={nodeFill(node.kind)}
                    r={radius}
                    filter={isHub ? "url(#knowledge-glow)" : undefined}
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="0.8"
                  />
                  {satelliteOffsets(node.id).map((offset, index) => (
                    <g key={`${node.id}-satellite-${index}`}>
                      <path
                        d={`M ${node.x} ${node.y} Q ${node.x + offset.cx} ${node.y + offset.cy} ${node.x + offset.x} ${node.y + offset.y}`}
                        fill="none"
                        stroke="rgba(236,242,255,0.34)"
                        strokeLinecap="round"
                        strokeWidth="0.55"
                      />
                      <circle
                        cx={node.x + offset.x}
                        cy={node.y + offset.y}
                        fill={index % 2 === 0 ? "#6df7a6" : "#dbe6ff"}
                        r="1.8"
                      />
                    </g>
                  ))}
                  <text
                    fill="rgba(244,248,255,0.82)"
                    fontSize="8"
                    letterSpacing="0"
                    textAnchor={node.x > 610 ? "end" : "start"}
                    x={node.x > 610 ? node.x - radius - 5 : node.x + radius + 5}
                    y={node.y + 3}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: StorySignal }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-2xl leading-tight">{signal.label}</h3>
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--almanac-ink-soft)]">
          {signal.strength}%
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {signal.explanation}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[color:var(--almanac-butter)]"
          style={{ width: `${signal.strength}%` }}
        />
      </div>
    </article>
  );
}

function ReflectionRow({ reflection }: { reflection: ReflectionCard }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {reflection.sourceLabel} - {formatDate(reflection.date)}
      </p>
      <h3 className="mt-2 font-serif text-2xl leading-tight">{reflection.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {reflection.summary}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {reflection.themes.map((theme) => (
          <Pill key={theme}>{theme}</Pill>
        ))}
      </div>
    </article>
  );
}

function WeeklyActionRow({
  action,
  onStart,
}: {
  action: WeeklyAction;
  onStart: () => void;
}) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-serif text-2xl leading-tight">{action.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>{action.status}</Pill>
            <Pill>{action.timeEstimate}</Pill>
          </div>
        </div>
        <button
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--almanac-rule)] px-4 text-sm font-medium transition hover:bg-white/50"
          onClick={onStart}
          type="button"
        >
          Start reflection
        </button>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {action.whyItMatters}
      </p>
      <p className="mt-3 rounded-xl bg-white/45 px-3 py-2 text-sm leading-6 text-[color:var(--almanac-ink)]">
        {action.suggestedPrompt}
      </p>
    </article>
  );
}

function CollegeCard({ college }: { college: CollegeListItem }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
            {college.location || "Location TBD"}
          </p>
          <h3 className="mt-1 font-serif text-2xl leading-tight">{college.name}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
            {college.fitReason || "Add a fit note from a reflection or college-fit conversation."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Pill>{college.status}</Pill>
          <Pill>{college.priority} priority</Pill>
          <Pill>{college.source === "conversation" ? "From conversation" : "Manual"}</Pill>
        </div>
      </div>

      <form action={updateCollegeListEntry} className="mt-4 grid gap-2 rounded-xl bg-white/35 p-3">
        <input name="id" type="hidden" value={college.id} />
        <TextInput name="name" placeholder="College name" required defaultValue={college.name} />
        <div className="grid gap-2 md:grid-cols-2">
          <TextInput name="location" placeholder="Location" defaultValue={college.location ?? ""} />
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectInput name="status" defaultValue={college.status}>
              {collegeStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
            <SelectInput name="priority" defaultValue={college.priority}>
              {collegePriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
        <TextInput
          name="fit_reason"
          placeholder="Why this school might fit"
          defaultValue={college.fitReason ?? ""}
        />
        <TextArea name="notes" placeholder="Notes from sessions, research, or counselor feedback" defaultValue={college.notes ?? ""} />
        <button
          className="h-10 rounded-lg border border-[color:var(--almanac-rule)] px-4 text-sm font-medium transition hover:bg-white/55"
          type="submit"
        >
          Save changes
        </button>
      </form>
    </article>
  );
}

function CollegeListForm() {
  return (
    <form
      action={createCollegeListEntry}
      className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper)] p-5"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-[color:var(--almanac-ink)] text-[color:var(--almanac-paper)]">
          <Plus size={15} />
        </span>
        <h3 className="font-serif text-2xl leading-tight">Add college</h3>
      </div>
      <div className="mt-4 grid gap-2">
        <TextInput name="name" placeholder="College name" required />
        <TextInput name="location" placeholder="Location" />
        <TextInput name="fit_reason" placeholder="Why it might fit" />
        <div className="grid gap-2 sm:grid-cols-2">
          <SelectInput name="status" defaultValue="Interested">
            {collegeStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectInput>
          <SelectInput name="priority" defaultValue="Medium">
            {collegePriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </SelectInput>
        </div>
        <TextArea name="notes" placeholder="Notes" />
        <button className="h-10 rounded-lg bg-[color:var(--almanac-ink)] px-4 text-sm font-medium text-[color:var(--almanac-paper)]">
          Add college
        </button>
      </div>
    </form>
  );
}

function ReadinessCard({ area }: { area: ReadinessArea }) {
  return (
    <article className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-4">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {area.label}
      </p>
      <h3 className="mt-2 font-serif text-2xl leading-tight">{area.value}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink-soft)]">
        {area.detail}
      </p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full rounded-full bg-[color:var(--almanac-butter)]"
          style={{ width: `${area.progress}%` }}
        />
      </div>
    </article>
  );
}

function ReadinessLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] px-4 py-3">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--almanac-ink)]">{value}</p>
    </div>
  );
}

function DiagnosisList({ items, label }: { items: string[]; label: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--almanac-rule)] bg-[color:var(--almanac-paper-deep)] p-5">
      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[color:var(--almanac-ink-soft)]">
        {label}
      </p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <p className="text-sm leading-6 text-[color:var(--almanac-ink)]" key={item}>
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--almanac-butter)] px-5 text-sm font-medium text-[color:var(--almanac-ink)] transition hover:bg-[#d5a84d]"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-20 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 py-2 text-sm leading-6 text-[color:var(--almanac-ink)] outline-none placeholder:text-[color:var(--almanac-ink-soft)] focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="h-10 min-w-0 rounded-lg border border-[color:var(--almanac-rule)] bg-white/65 px-3 text-sm text-[color:var(--almanac-ink)] outline-none focus:border-[color:var(--almanac-olive)]"
    />
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex w-fit rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-[color:var(--almanac-ink-soft)]">
      {children}
    </span>
  );
}

function buildDashboardModel({
  awards,
  collegeList,
  goals,
  guidedSessions,
  notes,
  tasks,
  activities,
}: Pick<
  DashboardViewProps,
  "awards" | "collegeList" | "goals" | "guidedSessions" | "notes" | "tasks" | "activities"
>): DashboardModel {
  const latestSession = guidedSessions[0];
  const guidedNotes = notes.filter((note) => note.category.toLowerCase().includes("guided"));
  const latestReflectionNote = guidedNotes[0] ?? notes[0];
  const summarySource = [
    latestSession?.summary,
    latestSession?.transcript,
    latestReflectionNote?.body,
    activities[0]?.impact,
    activities[0]?.name,
  ]
    .filter(Boolean)
    .join(" ");

  const storySignals = scoreSignals(summarySource);
  const reflections = buildReflections(notes, guidedSessions);
  const essaySeeds = buildEssaySeeds(storySignals, reflections);
  const activityPipeline = buildActivityPipeline(activities);
  const weeklyActions = buildWeeklyActions(tasks, latestSession);
  const colleges = buildCollegeList(collegeList);
  const knowledgeGraph = buildKnowledgeGraph({
    activities,
    collegeList: colleges,
    reflections,
    storySignals,
    weeklyActions,
  });
  const profileDepth = buildProfileDepth({ activities, awards, reflections });
  const readinessAreas = buildReadinessAreas({
    activities,
    awards,
    collegeList,
    guidedSessions,
    notes,
    reflections,
    essaySeeds,
  });
  const commonAppReadiness = buildCommonAppReadiness({ activities, essaySeeds, reflections });
  const ucReadiness = buildUCReadiness({ activities, awards, goals, notes });
  const profileDiagnosis = buildDiagnosis({ activities, awards, guidedSessions, storySignals });
  const completedThisWeek = weeklyActions
    .filter((item) => item.status === "Done")
    .map((item) => item.title)
    .slice(0, 3);

  return {
    continuePanel: {
      heroSummary:
        summarizeLead(latestSession?.summary ?? latestReflectionNote?.body) ??
        dashboardDemo.continuePanel.heroSummary,
      currentFocus: latestSession?.focus ?? dashboardDemo.continuePanel.currentFocus,
      lastReflectionSummary:
        summarizeReflection(latestSession?.summary ?? latestSession?.transcript ?? latestReflectionNote?.body) ??
        dashboardDemo.continuePanel.lastReflectionSummary,
      recommendedPrompt: latestSession?.focus
        ? `Record a 5-minute reflection on ${latestSession.focus.toLowerCase()}.`
        : dashboardDemo.continuePanel.recommendedPrompt,
      weeklyAction: weeklyActions[0]?.title ?? dashboardDemo.continuePanel.weeklyAction,
    },
    storySignals,
    activityPipeline,
    reflections,
    essaySeeds,
    weeklyActions,
    completedThisWeek: completedThisWeek.length ? completedThisWeek : dashboardDemo.completedThisWeek,
    collegeList: colleges,
    knowledgeGraph,
    profileDepth,
    readinessAreas,
    commonAppReadiness,
    ucReadiness,
    profileDiagnosis,
  };
}

function scoreSignals(sourceText: string): StorySignal[] {
  const score = (keywords: string[]) => {
    const text = sourceText.toLowerCase();
    const hits = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
    return Math.min(96, 52 + hits * 8);
  };

  return dashboardDemo.storySignals.map((signal) => {
    const keywords =
      signal.label === "Curiosity"
        ? ["curious", "explore", "learn", "question", "research", "why", "how"]
        : signal.label === "Initiative"
          ? ["started", "created", "organized", "launched", "built", "initiated", "led"]
          : signal.label === "Community impact"
            ? ["helped", "community", "tutored", "mentor", "volunteer", "served", "people"]
            : signal.label === "Resilience"
              ? ["hard", "challenge", "setback", "failed", "difficult", "adapt", "problem"]
              : signal.label === "Leadership"
                ? ["lead", "led", "team", "mentor", "coach", "organized", "captain"]
                : ["question", "prototype", "design", "analyze", "experiment", "build", "deep"];
    return { ...signal, strength: score(keywords) };
  });
}

function buildReflections(notes: Note[], sessions: GuidedSession[]): ReflectionCard[] {
  const reflectionNotes = notes
    .filter((note) => note.category.toLowerCase().includes("guided"))
    .slice(0, 3)
    .map((note) => ({
      id: note.id,
      title: note.title,
      date: note.created_at,
      summary: summarize(note.body),
      themes: extractThemes(`${note.title} ${note.body}`),
      sourceLabel: note.category || "Reflection",
      transcriptPreview: note.body.slice(0, 180),
    }));

  const reflectionSessions = sessions.slice(0, 3).map((session) => ({
    id: session.id,
    title: session.session_label,
    date: session.completed_at ?? session.created_at,
    summary: summarize(session.summary ?? session.transcript ?? session.focus ?? ""),
    themes: extractThemes(
      `${session.session_label} ${session.summary ?? session.transcript ?? session.focus ?? ""}`,
    ),
    sourceLabel: "Voice session",
    transcriptPreview: session.transcript?.slice(0, 180),
  }));

  const combined = [...reflectionSessions, ...reflectionNotes]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 4);

  return combined.length >= 3 ? combined : [...combined, ...dashboardDemo.reflections].slice(0, 4);
}

function buildEssaySeeds(signals: StorySignal[], reflections: ReflectionCard[]): EssaySeed[] {
  const topThemes = signals.slice(0, 3).map((signal) => signal.label.toLowerCase());
  const reflectionLead = reflections[0]?.title ?? "a meaningful moment";

  return dashboardDemo.essaySeeds.map((seed, index) => ({
    ...seed,
    relatedTheme: `${seed.relatedTheme} - ${topThemes[index] ?? topThemes[0] ?? "story"}`,
    openingScene:
      index === 0 && reflections[0]
        ? `Start with ${reflectionLead.toLowerCase()} and the exact moment the conversation changed.`
        : seed.openingScene,
  }));
}

function buildActivityPipeline(activities: Activity[]): ActivityPipelineItem[] {
  if (!activities.length) return dashboardDemo.activityPipeline;

  const mapped = activities.map((activity) => {
    const hasImpact = Boolean(activity.impact?.trim());
    const hasRole = Boolean(activity.role?.trim());
    const stage: ActivityPipelineItem["stage"] =
      hasImpact && hasRole ? "Application-ready" : hasImpact || hasRole ? "In progress" : "Raw ideas";

    return {
      title: activity.name,
      description:
        activity.impact?.trim() ||
        activity.role?.trim() ||
        "Add a short description that shows what changed because you were involved.",
      stage,
      nextImprovement:
        stage === "Raw ideas"
          ? "Add your role, who it helped, and one concrete result."
          : stage === "In progress"
            ? "Add a measurable result, size, or outcome."
            : "Trim the wording so the impact is obvious in one line.",
      valueTag: detectValueTag(`${activity.name} ${activity.role ?? ""} ${activity.impact ?? ""}`),
    };
  });

  return [...mapped, ...dashboardDemo.activityPipeline].slice(0, 6);
}

function buildWeeklyActions(
  tasks: StudentTask[],
  session: GuidedSession | undefined,
): WeeklyAction[] {
  const mappedTasks = tasks.slice(0, 3).map((task) => ({
    title: task.title,
    status: mapTaskStatus(task.status),
    timeEstimate: task.status.toLowerCase().includes("done") ? "done" : "15 minutes",
    whyItMatters: "This keeps a live admissions task from staying vague or stalled.",
    suggestedPrompt:
      session?.focus ?? "What is the next smallest step that would make this easier to finish?",
  }));

  return mappedTasks.length >= 3 ? mappedTasks : [...mappedTasks, ...dashboardDemo.weeklyActions].slice(0, 3);
}

function buildCollegeList(colleges: CollegeListEntry[]): CollegeListItem[] {
  return colleges.map((college) => ({
    id: college.id,
    name: college.name,
    location: college.location,
    fitReason: college.fit_reason,
    status: normalizeCollegeStatus(college.status),
    priority: normalizeCollegePriority(college.priority),
    notes: college.notes,
    source: normalizeCollegeSource(college.source),
    lastMentionedAt: college.last_mentioned_at,
  }));
}

function buildKnowledgeGraph({
  activities,
  collegeList,
  reflections,
  storySignals,
  weeklyActions,
}: {
  activities: Activity[];
  collegeList: CollegeListItem[];
  reflections: ReflectionCard[];
  storySignals: StorySignal[];
  weeklyActions: WeeklyAction[];
}): KnowledgeGraph {
  const topSignals = storySignals
    .slice()
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 4)
    .map((signal) => ({
      id: slugify(signal.label),
      label: signal.label,
      strength: signal.strength,
      kind: "theme" as const,
    }));
  const activityNodes = activities.slice(0, 2).map((activity) => ({
    id: `activity-${slugify(activity.name)}`,
    label: compactLabel(activity.name),
    strength: activity.impact?.trim() ? 74 : 58,
    kind: "activity" as const,
  }));
  const collegeNodes = collegeList.slice(0, 2).map((college) => ({
    id: `college-${slugify(college.name)}`,
    label: compactLabel(college.name),
    strength: college.priority === "High" ? 76 : college.priority === "Medium" ? 64 : 52,
    kind: "college" as const,
  }));
  const actionNode =
    weeklyActions[0]
      ? [{
          id: "next-action",
          label: "Next action",
          strength: weeklyActions[0].status === "Done" ? 50 : 68,
          kind: "action" as const,
        }]
      : [];
  const nodes = [...topSignals, ...activityNodes, ...collegeNodes, ...actionNode].slice(0, 8);

  if (nodes.length < 4) return dashboardDemo.knowledgeGraph;

  const links = nodes.slice(1).map((node, index) => ({
    source: nodes[0].id,
    target: node.id,
    strength: Math.max(42, Math.min(90, Math.round((nodes[0].strength + node.strength) / 2) - index * 3)),
  }));
  const reflectionThemes = new Set(reflections.flatMap((reflection) => reflection.themes.map(slugify)));
  const themeLinks = nodes
    .filter((node) => node.kind !== "theme")
    .flatMap((node) =>
      nodes
        .filter((candidate) => candidate.kind === "theme" && reflectionThemes.has(candidate.id))
        .slice(0, 1)
        .map((candidate) => ({
          source: candidate.id,
          target: node.id,
          strength: Math.min(84, Math.round((candidate.strength + node.strength) / 2)),
        })),
    );

  return {
    nodes,
    links: [...links, ...themeLinks].slice(0, 10),
  };
}

function buildReadinessAreas({
  activities,
  awards,
  collegeList,
  guidedSessions,
  notes,
  essaySeeds,
}: {
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
  guidedSessions: GuidedSession[];
  notes: Note[];
  reflections: ReflectionCard[];
  essaySeeds: EssaySeed[];
}): DashboardModel["readinessAreas"] {
  const readyActivities = activities.filter(
    (activity) => activity.impact?.trim() && activity.role?.trim(),
  ).length;
  const recommendationPrep = Math.min(
    2,
    (guidedSessions.length > 0 ? 1 : 0) + (notes.length > 0 ? 1 : 0),
  );

  return [
    {
      label: "Activities",
      value: `${activities.length} drafted`,
      detail: `${readyActivities} close to ready`,
      progress: Math.min(100, 30 + activities.length * 8 + readyActivities * 10),
    },
    {
      label: "Essays",
      value: `${essaySeeds.length} seeds`,
      detail: "One story should become a first draft",
      progress: Math.min(100, 20 + essaySeeds.length * 12),
    },
    {
      label: "Awards",
      value: `${awards.length} collected`,
      detail: "Add dates and context",
      progress: Math.min(100, 25 + awards.length * 15),
    },
    {
      label: "Resume",
      value: `${Math.min(activities.length + awards.length, 10)} usable lines`,
      detail: "Built from activities and awards",
      progress: Math.min(100, (activities.length + awards.length) * 8),
    },
    {
      label: "Recommendations",
      value: `${recommendationPrep} prep signals`,
      detail: "Brag sheet material is forming",
      progress: Math.min(100, 25 + recommendationPrep * 25),
    },
    {
      label: "School list",
      value: collegeList.length ? `${collegeList.length} schools in play` : "No schools yet",
      detail: collegeList.length ? "Needs fit notes" : "Start with one fit-based school",
      progress: Math.min(100, collegeList.length * 12),
    },
    {
      label: "Summer programs",
      value: guidedSessions.length ? "1 idea in motion" : "No active plan yet",
      detail: "Useful if it supports the story",
      progress: guidedSessions.length ? 45 : 20,
    },
  ];
}

function buildProfileDepth({
  activities,
  awards,
  reflections,
}: {
  activities: Activity[];
  awards: Award[];
  reflections: ReflectionCard[];
}): ProfileDepth {
  const explore = Math.min(activities.length, 8);
  const distinguish = Math.min(awards.length, 6);
  const reflect = Math.min(reflections.length, 12);
  const noData = explore === 0 && distinguish === 0 && reflect === 0;

  if (noData) return dashboardDemo.profileDepth;

  const depthValue = Math.round(
    ((explore / 8 + distinguish / 6 + reflect / 12) / 3) * 100,
  );

  return {
    value: depthValue,
    breakdown: [
      {
        label: "Explore",
        current: explore,
        goal: 8,
        note: "activities & experiences",
        color: "#4e5b7a",
      },
      {
        label: "Distinguish",
        current: distinguish,
        goal: 6,
        note: "awards & leadership",
        color: "#d27b57",
      },
      {
        label: "Reflect",
        current: reflect,
        goal: 12,
        note: "essays & journal entries",
        color: "#efc97a",
      },
    ],
  };
}

function buildCommonAppReadiness({
  activities,
  essaySeeds,
  reflections,
}: {
  activities: Activity[];
  essaySeeds: EssaySeed[];
  reflections: ReflectionCard[];
}): DashboardModel["commonAppReadiness"] {
  const readyActivities = activities.filter(
    (activity) => activity.impact?.trim() && activity.role?.trim(),
  ).length;

  return {
    drafted: activities.length,
    ready: readyActivities,
    needsStrongerImpact: Math.max(0, activities.length - readyActivities),
    missingCategories: [
      essaySeeds.length ? "One tighter essay opening" : "Essay seed",
      reflections.length ? "Reflection-to-activity bridge" : "Reflection",
      readyActivities < 3 ? "Clearer impact statements" : "Resume-ready wording",
    ],
  };
}

function buildUCReadiness({
  activities,
  awards,
  goals,
  notes,
}: {
  activities: Activity[];
  awards: Award[];
  goals: Goal[];
  notes: Note[];
}): DashboardModel["ucReadiness"] {
  const serviceCount = activities.filter((activity) => {
    const text = `${activity.name} ${activity.impact ?? ""}`.toLowerCase();
    return text.includes("community") || text.includes("service") || text.includes("volunteer");
  }).length;

  return {
    activitiesAndAwards: `${activities.length} activity entries, ${awards.length} awards`,
    leadership: activities.some((activity) => activity.role?.trim())
      ? "Leadership is present, but needs sharper wording"
      : "Leadership still needs evidence",
    educationalPreparation: notes.length
      ? "Academic and reflection material are starting to connect"
      : "Needs more academic context",
    volunteering: serviceCount ? `${serviceCount} service-linked stories` : "Service needs proof points",
    awards: awards.length ? `${awards.length} awards or distinctions` : "No awards captured yet",
    gaps: [
      goals.length ? "Use school-fit notes to guide the list" : "Add school-fit notes",
      activities.length < 4 ? "Add more complete activity lines" : "Tighten activity wording",
      awards.length < 2 ? "Add more award detail" : "Keep awards concise",
    ],
  };
}

function buildDiagnosis({
  activities,
  awards,
  guidedSessions,
  storySignals,
}: {
  activities: Activity[];
  awards: Award[];
  guidedSessions: GuidedSession[];
  storySignals: StorySignal[];
}): DashboardModel["profileDiagnosis"] {
  const topSignals = storySignals.slice(0, 3).map((signal) => signal.label.toLowerCase());

  return {
    strengths: [
      `A clear mix of ${topSignals.join(", ") || "curiosity and initiative"} is emerging.`,
      activities.some((activity) => activity.impact?.trim())
        ? "Some activities already have useful raw material."
        : "The raw material is present, but impact language needs work.",
      guidedSessions.length
        ? "Reflections are producing essay material instead of random notes."
        : "A few more reflections will help the story land.",
    ],
    needsWork: [
      activities.some((activity) => !activity.impact?.trim())
        ? "Some activities still need a stronger result."
        : "Activity language is getting clearer.",
      awards.length < 2 ? "Awards and proof points are still light." : "Awards are present.",
      "The application story should narrow to one or two lanes.",
    ],
    nextAction:
      "Take one reflection and convert it into a sharper activity line, then keep only the best essay seed.",
  };
}

function summarize(text: string | null | undefined) {
  if (!text) return "No summary yet.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= 180 ? cleaned : `${cleaned.slice(0, 177).trimEnd()}...`;
}

function summarizeLead(text: string | null | undefined) {
  if (!text) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  if (firstSentence.length <= 96) return firstSentence;
  return `${firstSentence.slice(0, 93).trimEnd()}...`;
}

function summarizeReflection(text: string | null | undefined) {
  if (!text) return null;
  const cleaned = text
    .replace(/\b(Student|Coach|Assistant):/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  const summary = firstSentence.length > 140 ? `${firstSentence.slice(0, 137).trimEnd()}...` : firstSentence;

  return summary || null;
}

function extractThemes(text: string) {
  const lower = text.toLowerCase();
  const themes = [
    lower.includes("lead") || lower.includes("team") ? "leadership" : null,
    lower.includes("help") || lower.includes("service") || lower.includes("community")
      ? "community impact"
      : null,
    lower.includes("build") || lower.includes("design") || lower.includes("prototype")
      ? "intellectual exploration"
      : null,
    lower.includes("hard") || lower.includes("challenge") || lower.includes("setback")
      ? "resilience"
      : null,
    lower.includes("curious") || lower.includes("explore") ? "curiosity" : null,
  ].filter((item): item is string => Boolean(item));

  return themes.length ? themes : ["reflection"];
}

function detectValueTag(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("service") || lower.includes("help") || lower.includes("volunteer")) return "service";
  if (lower.includes("lead") || lower.includes("team") || lower.includes("mentor")) return "leadership";
  if (lower.includes("design") || lower.includes("build") || lower.includes("create")) return "creativity";
  if (lower.includes("research") || lower.includes("analyze") || lower.includes("learn")) {
    return "intellectual vitality";
  }
  if (lower.includes("community")) return "community impact";
  return undefined;
}

function normalizeCollegeStatus(status: string): CollegeListItem["status"] {
  return collegeStatuses.includes(status as CollegeListItem["status"])
    ? (status as CollegeListItem["status"])
    : "Interested";
}

function normalizeCollegePriority(priority: string): CollegeListItem["priority"] {
  return collegePriorities.includes(priority as CollegeListItem["priority"])
    ? (priority as CollegeListItem["priority"])
    : "Medium";
}

function normalizeCollegeSource(source: string): CollegeListItem["source"] {
  return source === "conversation" || source === "imported" ? source : "manual";
}

function layoutGraphNodes(nodes: KnowledgeGraphNode[]) {
  const positions = [
    { x: 382, y: 118 },
    { x: 198, y: 70 },
    { x: 566, y: 66 },
    { x: 128, y: 166 },
    { x: 630, y: 160 },
    { x: 382, y: 42 },
    { x: 306, y: 190 },
    { x: 470, y: 192 },
  ];

  return nodes.map((node, index) => ({
    ...node,
    ...(positions[index] ?? positions[positions.length - 1]),
  }));
}

function nodeFill(kind: KnowledgeGraphNode["kind"]) {
  if (kind === "theme") return "#58ff9a";
  if (kind === "activity") return "#eaf0ff";
  if (kind === "college") return "#8bbdff";
  return "#f0c76f";
}

function satelliteOffsets(seed: string) {
  const base = seed.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const count = 3 + (base % 3);

  return Array.from({ length: count }, (_, index) => {
    const angle = ((base + index * 73) % 360) * (Math.PI / 180);
    const distance = 22 + ((base + index * 11) % 30);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.72,
      cx: Math.cos(angle + 0.7) * distance * 0.42,
      cy: Math.sin(angle + 0.7) * distance * 0.28,
    };
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function compactLabel(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 18) return cleaned;
  return `${cleaned.slice(0, 15).trimEnd()}...`;
}

function mapTaskStatus(status: string): WeeklyAction["status"] {
  const lower = status.toLowerCase();
  if (lower.includes("done") || lower.includes("complete")) return "Done";
  if (lower.includes("progress") || lower.includes("doing") || lower.includes("started")) {
    return "In progress";
  }
  return "Not started";
}
