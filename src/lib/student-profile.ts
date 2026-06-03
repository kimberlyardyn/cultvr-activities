// Shared option sets for the student profile in Settings.
// Kept in one place so the form UI, the server action's validation, and the AI
// context all agree on the allowed values and their human-readable labels.

export const USER_IDENTITY_VALUES = [
  "high_school",
  "middle_school",
  "college",
  "graduate",
  "young_professional",
  "free_spirit",
] as const;

export const CURRENT_PRIORITY_VALUES = [
  "college_application",
  "graduate_application",
  "job_placement",
  "career_switch",
  "personal_development",
] as const;

export type UserIdentity = (typeof USER_IDENTITY_VALUES)[number];
export type CurrentPriority = (typeof CURRENT_PRIORITY_VALUES)[number];

export const USER_IDENTITY_LABELS: Record<UserIdentity, string> = {
  high_school: "High School Student",
  middle_school: "Middle School",
  college: "College",
  graduate: "Graduate Student",
  young_professional: "Young Professional",
  free_spirit: "Free Spirit",
};

export const CURRENT_PRIORITY_LABELS: Record<CurrentPriority, string> = {
  college_application: "College application preparation",
  graduate_application: "Graduate program application",
  job_placement: "Job placement",
  career_switch: "Switch career direction",
  personal_development: "Personal development",
};

export const USER_IDENTITY_OPTIONS = USER_IDENTITY_VALUES.map((value) => ({
  value,
  label: USER_IDENTITY_LABELS[value],
}));

export const CURRENT_PRIORITY_OPTIONS = CURRENT_PRIORITY_VALUES.map((value) => ({
  value,
  label: CURRENT_PRIORITY_LABELS[value],
}));

export function userIdentityLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return USER_IDENTITY_LABELS[value as UserIdentity] ?? null;
}

export function currentPriorityLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return CURRENT_PRIORITY_LABELS[value as CurrentPriority] ?? null;
}
