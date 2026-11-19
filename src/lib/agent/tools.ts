import { z } from "zod";

/**
 * Agent tool registry — shared by the agent route (/api/agent), the execute
 * route (/api/agent/execute), and the Agent panel UI. Must stay client-safe
 * (plain data + zod only).
 *
 * Two kinds of tools:
 * - WRITE tools are consequential. The model calls them to PROPOSE an action;
 *   nothing is written until the student approves it and the execute route
 *   runs the matching mutation.
 * - READ tools run immediately on the server during the agent loop (e.g.
 *   search_workspace for retrieval) and feed their results back to the model.
 */

const reasonParam = {
  type: "string",
  description:
    "One sentence on why you are proposing this, tied to something real in the student's workspace.",
} as const;

export const WRITE_TOOLS = [
  {
    type: "function",
    name: "create_goal",
    description:
      "Propose creating a new goal for the student (a concrete outcome to work toward). The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, specific goal title (2-160 characters)." },
        target_date: { type: "string", description: "Optional target date in YYYY-MM-DD format." },
        reason: reasonParam,
      },
      required: ["title", "reason"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_task",
    description:
      "Propose creating a task / to-do with an optional due date (a near-term, actionable step). The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short, actionable task title (2-160 characters)." },
        due_date: { type: "string", description: "Optional due date in YYYY-MM-DD format." },
        reason: reasonParam,
      },
      required: ["title", "reason"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "update_activity",
    description:
      "Propose improving an EXISTING activity the student already has, by rewriting its impact statement and/or description to be clearer and more specific. Only use an activity_id taken from the provided workspace index. The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        activity_id: {
          type: "string",
          description: "The id of the existing activity to update, copied exactly from the workspace index.",
        },
        activity_name: {
          type: "string",
          description: "The activity's name, for display in the approval card.",
        },
        impact: {
          type: "string",
          description: "Optional rewritten impact / result statement (clearer and more specific).",
        },
        description: { type: "string", description: "Optional rewritten description." },
        reason: reasonParam,
      },
      required: ["activity_id", "activity_name", "reason"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "add_college",
    description:
      "Propose adding a college to the student's college list, when they have shown real interest in it or it clearly fits what they want. Never duplicate a college already on their list. The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The college's name." },
        location: { type: "string", description: "Optional city / state or country." },
        fit_reason: {
          type: "string",
          description: "Why this school fits the student, in their own terms where possible.",
        },
        status: {
          type: "string",
          enum: ["Dream", "Reach", "Match", "Necessity"],
          description: "Optional list category. Defaults to Dream.",
        },
        reason: reasonParam,
      },
      required: ["name", "reason"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_note",
    description:
      "Propose saving a note to the student's workspace — e.g. a reflection, an essay idea, or a summary of what you worked out together. The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short note title (2-120 characters)." },
        body: { type: "string", description: "The note content (2-6000 characters)." },
        category: {
          type: "string",
          description: "Optional category, e.g. Reflection, Essay Idea, Planning. Defaults to Reflection.",
        },
        reason: reasonParam,
      },
      required: ["title", "body", "reason"],
      additionalProperties: false,
    },
  },
] as const;

export const READ_TOOLS = [
  {
    type: "function",
    name: "search_workspace",
    description:
      "Search the student's whole workspace (notes, activities, awards, past sessions, goals, colleges) for details relevant to a query. Use it before making claims or proposals about specifics you do not see in the summary context. Runs immediately and returns matching excerpts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to look for, in plain words (e.g. 'robotics leadership moments').",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

export const AGENT_TOOLS = [...WRITE_TOOLS, ...READ_TOOLS];

export type AgentToolName = (typeof WRITE_TOOLS)[number]["name"];

const WRITE_TOOL_NAMES = new Set<string>(WRITE_TOOLS.map((tool) => tool.name));

/** True for consequential (approval-gated) tools only. */
export function isAgentToolName(name: string): name is AgentToolName {
  return WRITE_TOOL_NAMES.has(name);
}

// Validation applied in the execute route before any write.
export const toolArgSchemas = {
  create_goal: z.object({
    title: z.string().min(2).max(160),
    target_date: z.string().max(40).nullish(),
    reason: z.string().max(400).nullish(),
  }),
  create_task: z.object({
    title: z.string().min(2).max(160),
    due_date: z.string().max(40).nullish(),
    reason: z.string().max(400).nullish(),
  }),
  update_activity: z.object({
    activity_id: z.string().min(1).max(100),
    activity_name: z.string().max(200).nullish(),
    impact: z.string().max(2000).nullish(),
    description: z.string().max(2000).nullish(),
    reason: z.string().max(400).nullish(),
  }),
  add_college: z.object({
    name: z.string().min(2).max(160),
    location: z.string().max(160).nullish(),
    fit_reason: z.string().max(1000).nullish(),
    status: z.enum(["Dream", "Reach", "Match", "Necessity"]).nullish(),
    reason: z.string().max(400).nullish(),
  }),
  create_note: z.object({
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(6000),
    category: z.string().max(40).nullish(),
    reason: z.string().max(400).nullish(),
  }),
} satisfies Record<AgentToolName, z.ZodTypeAny>;

export const TOOL_META: Record<AgentToolName, { label: string; verb: string }> = {
  create_goal: { label: "New goal", verb: "Create goal" },
  create_task: { label: "New task", verb: "Create task" },
  update_activity: { label: "Improve activity", verb: "Apply update" },
  add_college: { label: "Add college", verb: "Add to list" },
  create_note: { label: "New note", verb: "Save note" },
};

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clip(text: string, max = 90) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** One-line summary of a proposed action for the approval card / log. */
export function summarizeAction(tool: AgentToolName, args: Record<string, unknown>): string {
  switch (tool) {
    case "update_activity": {
      const name = str(args.activity_name) || "activity";
      const change = str(args.impact) || str(args.description);
      return change ? `${name} → ${clip(change)}` : name;
    }
    case "add_college": {
      const name = str(args.name) || "(unnamed college)";
      const status = str(args.status);
      return status ? `${name} · ${status}` : name;
    }
    case "create_note":
      return str(args.title) || "(untitled note)";
    default: {
      const title = str(args.title) || "(untitled)";
      const when = str(args.target_date) || str(args.due_date);
      return when ? `${title} · ${when}` : title;
    }
  }
}
