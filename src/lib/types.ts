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

export type DashboardData = {
  notes: Note[];
  goals: Goal[];
  tasks: StudentTask[];
  activities: Activity[];
};
