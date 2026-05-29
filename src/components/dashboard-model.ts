export type DashboardTab =
  | "continue"
  | "story-activities"
  | "awards"
  | "weekly-challenge"
  | "college-list"
  | "application-readiness";

export type StorySignal = {
  label: string;
  explanation: string;
  strength: number;
};

export type ActivityStage = "Raw ideas" | "In progress" | "Application-ready";

export type ActivityPipelineItem = {
  title: string;
  description: string;
  stage: ActivityStage;
  nextImprovement: string;
  valueTag?: string;
};

export type ReflectionCard = {
  id: string;
  title: string;
  date: string;
  summary: string;
  themes: string[];
  sourceLabel: string;
  transcriptPreview?: string;
};

export type EssaySeed = {
  id: string;
  title: string;
  emotionalCore: string;
  openingScene: string;
  relatedTheme: string;
  warning?: string | null;
};

export type WeeklyAction = {
  title: string;
  status: "Not started" | "In progress" | "Done";
  timeEstimate: string;
  whyItMatters: string;
  suggestedPrompt: string;
};

export type CollegeListItem = {
  id: string;
  name: string;
  location: string | null;
  fitReason: string | null;
  status: "Dream" | "Reach" | "Match" | "Necessity" | "Getting Close" | "Actualized" | "Set Aside For Now";
  priority: "High" | "Medium" | "Low";
  notes: string | null;
  source: "manual" | "conversation" | "imported";
  lastMentionedAt: string | null;
};

export type ReadinessArea = {
  label: string;
  value: string;
  detail: string;
  progress: number;
};

export type CommonAppReadiness = {
  drafted: number;
  ready: number;
  needsStrongerImpact: number;
  missingCategories: string[];
};

export type UCReadiness = {
  activitiesAndAwards: string;
  leadership: string;
  educationalPreparation: string;
  volunteering: string;
  awards: string;
  gaps: string[];
};

export type ProfileDiagnosis = {
  strengths: string[];
  needsWork: string[];
  nextAction: string;
};

export type ContinuePanel = {
  heroSummary: string;
  currentFocus: string;
  lastReflectionSummary: string;
  recommendedPrompt: string;
  weeklyAction: string;
};

export type ProfileDepthBreakdown = {
  label: string;
  current: number;
  goal: number;
  note: string;
  color: string;
};

export type ProfileDepth = {
  value: number;
  breakdown: ProfileDepthBreakdown[];
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  strength: number;
  kind: "theme" | "activity" | "college" | "action";
};

export type KnowledgeGraphLink = {
  source: string;
  target: string;
  strength: number;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
};

export type DashboardModel = {
  continuePanel: ContinuePanel;
  profileDepth: ProfileDepth;
  knowledgeGraph: KnowledgeGraph;
  storySignals: StorySignal[];
  activityPipeline: ActivityPipelineItem[];
  reflections: ReflectionCard[];
  essaySeeds: EssaySeed[];
  weeklyActions: WeeklyAction[];
  completedThisWeek: string[];
  collegeList: CollegeListItem[];
  readinessAreas: ReadinessArea[];
  commonAppReadiness: CommonAppReadiness;
  ucReadiness: UCReadiness;
  profileDiagnosis: ProfileDiagnosis;
};

export const dashboardDemo: DashboardModel = {
  continuePanel: {
    heroSummary: "Robotics started as a build and became a leadership story.",
    currentFocus: "Turn one real experience into a clearer admissions story",
    lastReflectionSummary:
      "The strongest part was the shift from building the robot to mentoring newer teammates and explaining decisions out loud.",
    recommendedPrompt: "Record a 5-minute reflection on the hardest moment in that project.",
    weeklyAction: "Rewrite one activity line so the result is clearer and more specific.",
  },
  profileDepth: {
    value: 33,
    breakdown: [
      { label: "Explore", current: 2, goal: 8, note: "activities & experiences", color: "#4e5b7a" },
      { label: "Distinguish", current: 1, goal: 6, note: "awards & leadership", color: "#d27b57" },
      { label: "Reflect", current: 3, goal: 12, note: "essays & journal entries", color: "#efc97a" },
    ],
  },
  knowledgeGraph: {
    nodes: [
      { id: "leadership", label: "Leadership", strength: 86, kind: "theme" },
      { id: "robotics", label: "Robotics", strength: 78, kind: "activity" },
      { id: "impact", label: "Impact", strength: 72, kind: "theme" },
      { id: "essay", label: "Essay seed", strength: 62, kind: "action" },
      { id: "fit", label: "College fit", strength: 58, kind: "college" },
    ],
    links: [
      { source: "leadership", target: "robotics", strength: 82 },
      { source: "robotics", target: "impact", strength: 72 },
      { source: "leadership", target: "essay", strength: 62 },
      { source: "fit", target: "robotics", strength: 54 },
    ],
  },
  storySignals: [
    {
      label: "Curiosity",
      explanation: "You keep describing the moment a project becomes interesting because you want to understand it more deeply.",
      strength: 86,
    },
    {
      label: "Initiative",
      explanation: "There is repeated evidence that you start work, solve problems early, and move ideas forward without being asked.",
      strength: 78,
    },
    {
      label: "Community impact",
      explanation: "Several reflections point to moments where your work helped teammates, younger students, or a local group.",
      strength: 72,
    },
    {
      label: "Resilience",
      explanation: "The draft story gets stronger when you describe what got difficult and how you kept going.",
      strength: 68,
    },
    {
      label: "Leadership",
      explanation: "Your best examples show leadership through teaching, organizing, or making decisions others could follow.",
      strength: 74,
    },
    {
      label: "Intellectual exploration",
      explanation: "You have a clear pattern of turning a practical project into a deeper question or insight.",
      strength: 80,
    },
  ],
  activityPipeline: [
    {
      title: "Robotics prototype troubleshooting",
      description: "You described the week the system kept failing and you had to debug under pressure.",
      stage: "Raw ideas",
      nextImprovement: "Add the role you played and the result of the fix.",
      valueTag: "problem solving",
    },
    {
      title: "Peer tutoring for algebra",
      description: "A regular support role that could become stronger with specifics about who you helped and what changed.",
      stage: "In progress",
      nextImprovement: "Add a measurable result or a before/after example.",
      valueTag: "service",
    },
    {
      title: "Student engineering team lead",
      description: "This is close to application-ready because it already includes responsibility, teamwork, and output.",
      stage: "Application-ready",
      nextImprovement: "Tighten the language so the impact is easy to scan.",
      valueTag: "leadership",
    },
    {
      title: "Community garden redesign",
      description: "A clear story about working with others to improve a shared space.",
      stage: "In progress",
      nextImprovement: "Add who benefited and what changed because of your contribution.",
      valueTag: "community impact",
    },
    {
      title: "Design club project sprint",
      description: "A creative build that can become stronger if you show the purpose behind the work.",
      stage: "Raw ideas",
      nextImprovement: "Explain the challenge and the final result in one sentence.",
      valueTag: "creativity",
    },
    {
      title: "Local workshop for younger students",
      description: "This one already reads like a strong service and leadership example.",
      stage: "Application-ready",
      nextImprovement: "Add numbers if you have them.",
      valueTag: "service",
    },
  ],
  reflections: [
    {
      id: "reflection-robotics",
      title: "When robotics became leadership",
      date: "2026-05-20",
      summary:
        "The story shifted from building a machine to teaching teammates, solving issues calmly, and making the project easier for others to join.",
      themes: ["leadership", "initiative", "community impact"],
      sourceLabel: "Voice reflection",
      transcriptPreview:
        "We hit a wall halfway through the build, and I realized my job was not just to fix the code but to help everyone understand what was happening.",
    },
    {
      id: "reflection-essay",
      title: "A moment that changed how you work",
      date: "2026-05-16",
      summary:
        "You described a hard moment that pushed you to ask for help sooner and think more clearly about how to organize a team effort.",
      themes: ["resilience", "growth", "initiative"],
      sourceLabel: "Guided session",
    },
    {
      id: "reflection-service",
      title: "Why tutoring stayed meaningful",
      date: "2026-05-11",
      summary:
        "The value of tutoring was not just subject help; it was seeing a student become more confident and less hesitant.",
      themes: ["community impact", "service", "leadership"],
      sourceLabel: "Written reflection",
    },
  ],
  essaySeeds: [
    {
      id: "essay-robotics",
      title: "The moment the build stopped being about the machine",
      emotionalCore: "A shift from technical curiosity to responsibility for people.",
      openingScene: "A team standing around a broken prototype while you realized the next move was to teach, not just fix.",
      relatedTheme: "leadership + intellectual exploration",
      warning: "Watch for a generic STEM story; keep the human moment central.",
    },
    {
      id: "essay-tutoring",
      title: "Why helping one student mattered more than the schedule",
      emotionalCore: "A quiet service story about patience and trust.",
      openingScene: "A student hesitating before an answer, then slowly gaining confidence as the session continued.",
      relatedTheme: "community impact + service",
    },
    {
      id: "essay-resilience",
      title: "What you learned when the plan fell apart",
      emotionalCore: "A challenge story that shows growth without overdramatizing the setback.",
      openingScene: "The moment you realized the original plan was not going to work and you had to start again.",
      relatedTheme: "resilience + initiative",
      warning: "Avoid making the obstacle sound bigger than the learning.",
    },
  ],
  weeklyActions: [
    {
      title: "Record a 5-minute reflection on the hardest moment in the robotics project.",
      status: "Not started",
      timeEstimate: "5 minutes",
      whyItMatters: "This gives you a clearer story of challenge, problem solving, and growth.",
      suggestedPrompt: "What was the hardest moment, what did you do, and what changed after that?",
    },
    {
      title: "Rewrite one activity description with a stronger result or measurable impact.",
      status: "In progress",
      timeEstimate: "15 minutes",
      whyItMatters: "Admissions readers need to see what changed because you were involved.",
      suggestedPrompt: "What is the action, what changed, and how can you make that concrete?",
    },
    {
      title: "Send one follow-up message to a teacher, mentor, or organization.",
      status: "Done",
      timeEstimate: "10 minutes",
      whyItMatters: "Small follow-through keeps the application process moving.",
      suggestedPrompt: "What follow-up would remove uncertainty or unlock the next step?",
    },
  ],
  completedThisWeek: [
    "Clarified one essay story direction",
    "Captured a stronger version of the robotics reflection",
    "Drafted a cleaner activity description",
  ],
  collegeList: [
    {
      id: "college-northeastern",
      name: "Northeastern University",
      location: "Boston, MA",
      fitReason: "Strong co-op culture and applied project learning fit the robotics and design story.",
      status: "Reach",
      priority: "High",
      notes: "Ask whether project-based engineering and urban campus feel energizing.",
      source: "conversation",
      lastMentionedAt: "2026-05-18",
    },
    {
      id: "college-wpi",
      name: "Worcester Polytechnic Institute",
      location: "Worcester, MA",
      fitReason: "Hands-on engineering curriculum could support the maker/leadership theme.",
      status: "Dream",
      priority: "Medium",
      notes: "Compare project requirements and student team culture.",
      source: "manual",
      lastMentionedAt: "2026-05-16",
    },
  ],
  readinessAreas: [
    { label: "Activities", value: "6 drafted", detail: "3 ready to tighten further", progress: 65 },
    { label: "Essays", value: "3 viable seeds", detail: "1 story is ready for drafting", progress: 45 },
    { label: "Awards", value: "2 collected", detail: "Build out context and dates", progress: 55 },
    { label: "Resume", value: "Half-built", detail: "Can be assembled from activities and awards", progress: 42 },
    { label: "Recommendations", value: "2 relationships", detail: "One could use a clearer brag sheet", progress: 60 },
    { label: "School list", value: "Early draft", detail: "Needs fit notes and deadline sorting", progress: 35 },
    { label: "Summer programs", value: "1 idea", detail: "Use this to show exploration and initiative", progress: 30 },
  ],
  commonAppReadiness: {
    drafted: 6,
    ready: 3,
    needsStrongerImpact: 2,
    missingCategories: [
      "One activity with a clearer measurable result",
      "One stronger essay opening",
      "A more complete resume-style view",
    ],
  },
  ucReadiness: {
    activitiesAndAwards: "Drafted, but still needs cleaner wording and stronger context.",
    leadership: "Present in your stories, but not yet fully surfaced in the activity list.",
    educationalPreparation: "You have enough to start, but the academic story should be summarized more clearly.",
    volunteering: "You have service signals, yet the scope and frequency need tighter wording.",
    awards: "You have a couple of proof points; dates and context will make them stronger.",
    gaps: [
      "A more precise leadership entry",
      "A tighter summary of service work",
      "A few more award details",
    ],
  },
  profileDiagnosis: {
    strengths: [
      "Strong emerging theme around building things with people, not just for the sake of building.",
      "You have repeated evidence of initiative and teaching others.",
      "Your reflections already contain useful growth language for essays.",
    ],
    needsWork: [
      "Several activity entries still need clearer measurable impact.",
      "The essay ideas are promising but need one sharper emotional center.",
      "Your application story is there, but the categories are not yet fully organized.",
    ],
    nextAction:
      "Turn the robotics reflection into one stronger activity description and one essay seed before starting a new topic.",
  },
};
