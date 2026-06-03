import type { CurrentPriority, UserIdentity } from "@/lib/student-profile";

export type Note = {
  id: string;
  title: string;
  body: string;
  category: string;
  activity_id: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type Goal = {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
  activity_id: string | null;
  award_id: string | null;
  created_at: string;
};

export type WeeklyChallenge = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  week_start_date: string; // YYYY-MM-DD (always a Monday)
  status: "active" | "completed" | "missed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  name: string;
  role: string | null;
  impact: string | null;
  years: string | null;
  category: string | null;
  position: string | null;
  description: string | null;
  organization_description: string | null;
  grades: string[];
  start_date: string | null;
  end_date: string | null;
  in_progress: boolean;
  hours_per_week: number;
  weeks_per_year: number;
  tags: string[];
  sort_order: number;
  created_at: string;
};

export type Award = {
  id: string;
  name: string;
  scope: string | null;
  year: string | null;
  organization: string | null;
  description: string | null;
  requirements: string | null;
  level: string | null;
  activity_id: string | null;
  tags: string[];
  sort_order: number;
  created_at: string;
};

export type CollegeListEntry = {
  id: string;
  name: string;
  location: string | null;
  fit_reason: string | null;
  status: string;
  priority: string;
  notes: string | null;
  source: string;
  last_mentioned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfilePreferences = {
  display_name: string | null;
  full_name: string | null;
  nav_layout: "left" | "top";
  nav_collapsed: boolean;
  top_nav_collapsed: boolean;
  appearance: "paper" | "dark";
  font_family: "serif" | "sans";
};

export type StudentAdmissionsProfile = {
  user_id: string;
  date_of_birth: string | null;
  user_identity: UserIdentity | null;
  location: string | null;
  grade_level: string | null;
  current_priority: CurrentPriority | null;
  coaching_style: "direct" | "encouraging" | "structured" | "exploratory";
  personality_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentMemory = {
  id: string;
  user_id: string;
  memory_type:
    | "theme"
    | "strength"
    | "gap"
    | "activity_evidence"
    | "essay_seed"
    | "college_fit"
    | "next_prompt"
    | "coaching_preference";
  label: string;
  summary: string;
  confidence: number;
  source_session_id: string | null;
  status: "active" | "archived" | "rejected";
  created_at: string;
  updated_at: string;
};

export type StudentSessionContext = {
  profile: StudentAdmissionsProfile | null;
  memories: StudentMemory[];
  recentSessions: GuidedSession[];
  notes: Note[];
  goals: Goal[];
  tasks: StudentTask[];
  activities: Activity[];
  awards: Award[];
  collegeList: CollegeListEntry[];
};

export type PersonalizedSessionPlan = {
  sessionTitle: string;
  sessionFocus: string | null;
  openingPrompt: string;
  privateGoals: string[];
  suggestedPrompts: string[];
  contextBrief: string;
};

export type GuidedSession = {
  id: string;
  session_type: string;
  session_label: string;
  focus: string | null;
  interaction_mode: "voice" | "chat" | "mixed";
  status: "active" | "reviewed" | "completed" | "abandoned";
  transcript: string | null;
  summary: string | null;
  prompt_count: number;
  answered_count: number;
  note_id: string | null;
  goal_id: string | null;
  task_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type GuidedSessionAnswer = {
  id: string;
  session_id: string;
  prompt_index: number;
  prompt: string;
  answer: string | null;
  source: "voice" | "chat" | "manual";
  created_at: string;
};

export type DashboardData = {
  notes: Note[];
  goals: Goal[];
  tasks: StudentTask[];
  activities: Activity[];
  awards: Award[];
};
