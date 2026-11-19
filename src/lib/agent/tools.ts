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
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]["name"];

export function isAgentToolName(name: string): name is AgentToolName {
  return name === "create_goal" || name === "create_task";
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
} satisfies Record<AgentToolName, z.ZodTypeAny>;

export const TOOL_META: Record<AgentToolName, { label: string; verb: string }> = {
  create_goal: { label: "New goal", verb: "Create goal" },
  create_task: { label: "New task", verb: "Create task" },
};

/** One-line summary of a proposed action for the approval card. */
export function summarizeAction(tool: AgentToolName, args: Record<string, unknown>): string {
  const title = typeof args.title === "string" ? args.title : "(untitled)";
  const when =
    (typeof args.target_date === "string" && args.target_date) ||
    (typeof args.due_date === "string" && args.due_date) ||
    "";
  return when ? `${title} · ${when}` : title;
}
