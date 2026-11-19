import { z } from "zod";

/**
 * Agent tool registry — shared by the propose route (/api/agent), the execute
 * route (/api/agent/execute), and the Agent panel UI.
 *
 * Tools are "consequential": the model CALLS them to PROPOSE an action, but
 * nothing is written until the student approves it and the execute route runs
 * the matching mutation. This keeps a human in the loop for every change.
 */

// Function-tool schemas passed to the OpenAI Responses API.
export const AGENT_TOOLS = [
  {
    type: "function",
    name: "create_goal",
    description:
      "Propose creating a new goal for the student (a concrete outcome to work toward). The student must approve before it is saved.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short, specific goal title (2-160 characters).",
        },
        target_date: {
          type: "string",
          description: "Optional target date in YYYY-MM-DD format.",
        },
        reason: {
          type: "string",
          description:
            "One sentence on why you are proposing this, tied to something real in the student's workspace.",
        },
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
        title: {
          type: "string",
          description: "Short, actionable task title (2-160 characters).",
        },
        due_date: {
          type: "string",
          description: "Optional due date in YYYY-MM-DD format.",
        },
        reason: {
          type: "string",
          description:
            "One sentence on why you are proposing this, tied to something real in the student's workspace.",
        },
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
        description: {
          type: "string",
          description: "Optional rewritten description.",
        },
        reason: {
          type: "string",
          description: "One sentence on why this change helps, tied to the student's workspace.",
        },
      },
      required: ["activity_id", "activity_name", "reason"],
      additionalProperties: false,
    },
  },
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]["name"];

export function isAgentToolName(name: string): name is AgentToolName {
  return name === "create_goal" || name === "create_task" || name === "update_activity";
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
} satisfies Record<AgentToolName, z.ZodTypeAny>;

export const TOOL_META: Record<AgentToolName, { label: string; verb: string }> = {
  create_goal: { label: "New goal", verb: "Create goal" },
  create_task: { label: "New task", verb: "Create task" },
  update_activity: { label: "Improve activity", verb: "Apply update" },
};

/** One-line summary of a proposed action for the approval card. */
export function summarizeAction(tool: AgentToolName, args: Record<string, unknown>): string {
  if (tool === "update_activity") {
    const name = typeof args.activity_name === "string" ? args.activity_name : "activity";
    const change =
      (typeof args.impact === "string" && args.impact) ||
      (typeof args.description === "string" && args.description) ||
      "";
    const snippet = change.length > 90 ? `${change.slice(0, 90).trimEnd()}…` : change;
    return snippet ? `${name} → ${snippet}` : name;
  }
  const title = typeof args.title === "string" ? args.title : "(untitled)";
  const when =
    (typeof args.target_date === "string" && args.target_date) ||
    (typeof args.due_date === "string" && args.due_date) ||
    "";
  return when ? `${title} · ${when}` : title;
}
