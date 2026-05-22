export type Note = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};

export type Goal = {
  id: string;
  title: string;
  status: string;
  target_date: string | null;
  created_at: string;
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
  created_at: string;
};

export type Award = {
  id: string;
  name: string;
  scope: string | null;
  year: string | null;
  created_at: string;
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
