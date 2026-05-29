import type {
  Activity,
  Award,
  CollegeListEntry,
  Goal,
  GuidedSession,
  Note,
  PersonalizedSessionPlan,
  StudentAdmissionsProfile,
  StudentMemory,
  StudentSessionContext,
  StudentTask,
} from "@/lib/types";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => unknown;
  };
};

type QueryBuilder<T> = {
  eq?: (column: string, value: string) => QueryBuilder<T>;
  order?: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit?: (count: number) => Promise<{ data: T[] | null; error: { message: string } | null }>;
  maybeSingle?: () => Promise<{ data: T | null; error: { message: string } | null }>;
};

const MAX_CONTEXT_TEXT = 3600;

export async function buildStudentSessionContext(
  supabase: SupabaseLike,
  userId: string,
): Promise<StudentSessionContext> {
  const [
    profile,
    memories,
    sessions,
    notes,
    goals,
    tasks,
    activities,
    awards,
    collegeList,
  ] = await Promise.all([
    maybeSingle<StudentAdmissionsProfile>(
      supabase,
      "student_admissions_profiles",
      "user_id,grade_level,application_stage,intended_majors,interests,current_priorities,target_colleges,important_deadlines,coaching_style,personality_notes,created_at,updated_at",
      userId,
    ),
    maybeMany<StudentMemory>(
      supabase,
      "student_memories",
      "id,user_id,memory_type,label,summary,confidence,source_session_id,status,created_at,updated_at",
      userId,
      12,
    ),
    maybeMany<GuidedSession>(
      supabase,
      "guided_sessions",
      "id,session_type,session_label,focus,interaction_mode,status,transcript,summary,prompt_count,answered_count,note_id,goal_id,task_id,started_at,completed_at,created_at",
      userId,
      5,
    ),
    maybeMany<Note>(supabase, "notes", "id,title,body,category,activity_id,created_at", userId, 6),
    maybeMany<Goal>(supabase, "goals", "id,title,status,target_date,activity_id,award_id,created_at", userId, 6),
    maybeMany<StudentTask>(supabase, "tasks", "id,title,status,due_date,created_at", userId, 8),
    maybeMany<Activity>(
      supabase,
      "activities",
      "id,name,role,impact,years,category,position,description,organization_description,grades,start_date,end_date,in_progress,hours_per_week,weeks_per_year,tags,sort_order,created_at",
      userId,
      8,
    ),
    maybeMany<Award>(
      supabase,
      "awards",
      "id,name,scope,year,organization,description,requirements,level,activity_id,tags,sort_order,created_at",
      userId,
      8,
    ),
    maybeMany<CollegeListEntry>(
      supabase,
      "college_list",
      "id,name,location,fit_reason,status,priority,notes,source,last_mentioned_at,created_at,updated_at",
      userId,
      12,
    ),
  ]);

  return {
    profile,
    memories: memories.filter((memory) => memory.status === "active"),
    recentSessions: sessions,
    notes,
    goals,
    tasks,
    activities,
    awards,
    collegeList,
  };
}

export function createPersonalizedSessionPlan({
  context,
  currentPrompt,
  defaultPrompts,
  sessionFocus,
  sessionTitle,
}: {
  context: StudentSessionContext;
  currentPrompt?: string;
  defaultPrompts?: readonly string[];
  sessionFocus?: string | null;
  sessionTitle: string;
}): PersonalizedSessionPlan {
  const profile = context.profile;
  const topMemories = context.memories.slice(0, 5);
  const currentPriority = firstUseful(profile?.current_priorities);
  const strongestInterest = firstUseful(profile?.interests) ?? firstUseful(profile?.intended_majors);
  const activityGap = context.activities.find((activity) => !activity.impact?.trim());
  const schoolGap = context.collegeList.find((college) => !college.fit_reason?.trim());
  const latestSession = context.recentSessions[0];

  const suggestedPrompts = [
    currentPrompt,
    ...contextAwarePrompts({
      activityName: activityGap?.name,
      currentPriority,
      latestFocus: latestSession?.focus,
      schoolName: schoolGap?.name,
      sessionTitle,
      strongestInterest,
    }),
    ...(defaultPrompts ?? []),
  ]
    .filter((prompt): prompt is string => Boolean(prompt?.trim()))
    .filter(unique)
    .slice(0, 6);

  return {
    sessionTitle,
    sessionFocus: sessionFocus ?? null,
    openingPrompt:
      suggestedPrompts[0] ??
      "What is one experience from this year that feels important to understand better?",
    privateGoals: [
      "Ask one short question at a time and adapt based on the student's answer.",
      "Prioritize concrete evidence: role, stakes, choices, impact, values, and growth.",
      currentPriority ? `Connect the session to this current priority: ${currentPriority}.` : "",
      strongestInterest ? `Use this interest as context when helpful: ${strongestInterest}.` : "",
      activityGap ? `Look for details that could strengthen this activity: ${activityGap.name}.` : "",
      schoolGap ? `If college fit comes up, ask what would make ${schoolGap.name} a real fit.` : "",
      topMemories.length
        ? `Use these saved signals carefully: ${topMemories
            .map((memory) => `${memory.label}: ${memory.summary}`)
            .join(" | ")}.`
        : "",
    ].filter(Boolean),
    suggestedPrompts,
    contextBrief: formatStudentContextForPrompt(context),
  };
}

export function buildRealtimeInstructions(plan: PersonalizedSessionPlan) {
  return compactText(
    [
      "You are Cultvr, a concise college counseling voice coach for a high school student.",
      "Do not claim to be a licensed counselor or mental health professional.",
      `Selected session: ${plan.sessionTitle}.`,
      plan.sessionFocus ? `Session focus: ${plan.sessionFocus}.` : "",
      `Start with this question: ${plan.openingPrompt}`,
      `Private coaching goals: ${plan.privateGoals.join(" ")}`,
      `Student context: ${plan.contextBrief}`,
      "Keep the conversation natural and voice-first. Do not list every prompt. Ask one short question, listen, then redirect toward admissions-useful details.",
      "When there is enough useful material, give a brief recap and invite the student to end and review.",
    ].join("\n"),
    MAX_CONTEXT_TEXT,
  );
}

export function formatStudentContextForPrompt(context: StudentSessionContext) {
  const profile = context.profile;
  const profileText = profile
    ? [
        profile.grade_level ? `Grade/year: ${profile.grade_level}` : "",
        profile.application_stage ? `Stage: ${profile.application_stage}` : "",
        profile.intended_majors.length ? `Majors: ${profile.intended_majors.join(", ")}` : "",
        profile.interests.length ? `Interests: ${profile.interests.join(", ")}` : "",
        profile.current_priorities.length
          ? `Current priorities: ${profile.current_priorities.join(", ")}`
          : "",
        profile.target_colleges.length ? `Target colleges: ${profile.target_colleges.join(", ")}` : "",
        profile.important_deadlines ? `Deadlines: ${profile.important_deadlines}` : "",
        `Coaching style: ${profile.coaching_style}`,
        profile.personality_notes ? `Student preferences: ${profile.personality_notes}` : "",
      ]
        .filter(Boolean)
        .join("; ")
    : "No onboarding profile yet.";

  const memoryText = context.memories
    .slice(0, 8)
    .map((memory) => `${memory.memory_type}: ${memory.label} - ${memory.summary}`)
    .join(" | ");
  const sessionsText = context.recentSessions
    .slice(0, 3)
    .map((session) => `${session.session_label}: ${summarize(session.summary ?? session.transcript ?? session.focus)}`)
    .join(" | ");
  const activitiesText = context.activities
    .slice(0, 5)
    .map((activity) => `${activity.name}${activity.role ? ` (${activity.role})` : ""}${activity.impact ? ` - ${activity.impact}` : ""}`)
    .join(" | ");
  const collegeText = context.collegeList
    .slice(0, 5)
    .map((college) => `${college.name}${college.fit_reason ? ` - ${college.fit_reason}` : ""}`)
    .join(" | ");
  const taskText = context.tasks
    .slice(0, 5)
    .map((task) => `${task.title} (${task.status})`)
    .join(" | ");

  return compactText(
    [
      `Profile: ${profileText}`,
      memoryText ? `Saved signals: ${memoryText}` : "",
      sessionsText ? `Recent sessions: ${sessionsText}` : "",
      activitiesText ? `Activities: ${activitiesText}` : "",
      collegeText ? `College list: ${collegeText}` : "",
      taskText ? `Current tasks: ${taskText}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    MAX_CONTEXT_TEXT,
  );
}

export function deriveMemoriesFromSession({
  noteBody,
  sessionId,
  sessionLabel,
  transcript,
}: {
  noteBody: string;
  sessionId: string;
  sessionLabel: string;
  transcript?: string | null;
}) {
  const sourceText = compactText(`${noteBody}\n${transcript ?? ""}`, 1600);
  const themes = extractThemes(sourceText);
  const summary = summarize(sourceText, 260);
  const memories: Array<{
    memory_type: StudentMemory["memory_type"];
    label: string;
    summary: string;
    confidence: number;
    source_session_id: string;
  }> = [];

  memories.push({
    memory_type: "next_prompt",
    label: `${sessionLabel} follow-up`,
    summary: buildNextPrompt(sessionLabel, themes),
    confidence: 0.7,
    source_session_id: sessionId,
  });

  if (themes.length) {
    memories.push({
      memory_type: "theme",
      label: titleCase(themes[0]),
      summary: `This theme appeared in a ${sessionLabel.toLowerCase()} session: ${summary}`,
      confidence: 0.66,
      source_session_id: sessionId,
    });
  }

  if (sessionLabel.toLowerCase().includes("essay")) {
    memories.push({
      memory_type: "essay_seed",
      label: "Possible essay material",
      summary,
      confidence: 0.62,
      source_session_id: sessionId,
    });
  }

  if (sessionLabel.toLowerCase().includes("activity")) {
    memories.push({
      memory_type: "activity_evidence",
      label: "Activity evidence",
      summary,
      confidence: 0.62,
      source_session_id: sessionId,
    });
  }

  return memories.slice(0, 4);
}

async function maybeSingle<T>(
  supabase: SupabaseLike,
  table: string,
  columns: string,
  userId: string,
): Promise<T | null> {
  try {
    const query = supabase.from(table).select(columns) as QueryBuilder<T>;
    const result = await query.eq?.("user_id", userId).maybeSingle?.();
    return result?.data ?? null;
  } catch {
    return null;
  }
}

async function maybeMany<T>(
  supabase: SupabaseLike,
  table: string,
  columns: string,
  userId: string,
  limit: number,
): Promise<T[]> {
  try {
    const query = supabase.from(table).select(columns) as QueryBuilder<T>;
    const result = await query
      .eq?.("user_id", userId)
      .order?.("created_at", { ascending: false })
      .limit?.(limit);
    return result?.data ?? [];
  } catch {
    return [];
  }
}

function contextAwarePrompts({
  activityName,
  currentPriority,
  latestFocus,
  schoolName,
  sessionTitle,
  strongestInterest,
}: {
  activityName?: string;
  currentPriority?: string | null;
  latestFocus?: string | null;
  schoolName?: string;
  sessionTitle: string;
  strongestInterest?: string | null;
}) {
  const lower = sessionTitle.toLowerCase();
  if (lower.includes("college")) {
    return [
      schoolName ? `What makes ${schoolName} feel worth keeping on your list?` : "",
      "What learning environment helps you do your best work?",
      strongestInterest ? `What would a college need to offer for your interest in ${strongestInterest}?` : "",
    ];
  }
  if (lower.includes("essay")) {
    return [
      "What moment from this experience would a reader be able to picture?",
      "What did that moment reveal about how you think, work, or care?",
      latestFocus ? `How does this connect to what you were exploring last time: ${latestFocus}?` : "",
    ];
  }
  if (lower.includes("activity")) {
    return [
      activityName ? `What changed because of your work in ${activityName}?` : "",
      "What did you personally do that would not have happened otherwise?",
      "Can you add a number, result, audience, or before-and-after detail?",
    ];
  }
  return [
    currentPriority ? `How does this connect to your current priority: ${currentPriority}?` : "",
    strongestInterest ? `Where does ${strongestInterest} show up in this story?` : "",
    "What changed because of your choices?",
  ];
}

function extractThemes(text: string) {
  const lower = text.toLowerCase();
  const themes = [
    hasAny(lower, ["lead", "team", "mentor", "captain", "organize"]) ? "leadership" : null,
    hasAny(lower, ["community", "service", "volunteer", "help", "tutor"]) ? "community impact" : null,
    hasAny(lower, ["curious", "research", "learn", "explore", "why", "how"]) ? "curiosity" : null,
    hasAny(lower, ["challenge", "hard", "setback", "fail", "adapt"]) ? "resilience" : null,
    hasAny(lower, ["build", "design", "prototype", "code", "experiment"]) ? "intellectual exploration" : null,
    hasAny(lower, ["start", "created", "launched", "initiated"]) ? "initiative" : null,
  ].filter((theme): theme is string => Boolean(theme));

  return themes.length ? themes : ["reflection"];
}

function buildNextPrompt(sessionLabel: string, themes: string[]) {
  const theme = themes[0] ?? "this experience";
  if (sessionLabel.toLowerCase().includes("college")) {
    return `Ask what kind of college environment would help the student's ${theme} become stronger.`;
  }
  if (sessionLabel.toLowerCase().includes("essay")) {
    return `Ask for one vivid scene that shows ${theme} without explaining it abstractly.`;
  }
  return `Ask for one concrete moment that proves ${theme}, including the student's role and what changed.`;
}

function summarize(text: string | null | undefined, limit = 160) {
  if (!text) return "No summary yet.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 3).trimEnd()}...`;
}

function compactText(text: string, limit: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 3).trimEnd()}...`;
}

function firstUseful(items: string[] | null | undefined) {
  return items?.find((item) => item.trim()) ?? null;
}

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function unique(value: string, index: number, array: string[]) {
  return array.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index;
}
