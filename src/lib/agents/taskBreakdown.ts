import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";
import { buildTaskBreakdownPrompt } from "./prompts/ai/taskBreakdownPrompt";
import type { TaskBreakdownResult, ChatMessage } from "./types";

const taskBreakdownSchema = {
  type: "json_schema" as const,
  name: "task_breakdown",
  strict: true,
  schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Short imperative task description",
            },
            detail: {
              type: "string",
              description:
                "Source reference ONLY: a URL, phone number, or address. NOT a sentence. Leave empty string if no specific source.",
            },
            subtasks: {
              type: "array",
              items: { type: "string" },
              description: "0-4 subtask descriptions",
            },
            agent_action: {
              type: "string",
              enum: ["", "fill_pdf"],
              description:
                "If this task can be automated, specify the action. Available actions: 'fill_pdf' (download and fill a PDF form with known user info). Leave empty string for manual tasks. Use 'fill_pdf' when the task involves filling out a government or official form AND you know the PDF URL.",
            },
          },
          required: ["text", "detail", "subtasks", "agent_action"],
          additionalProperties: false,
        },
        description: "2-7 top-level tasks in order",
      },
      notices: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description:
                "Short label: 'Processing time', 'Fee', 'Heads up', 'Tip'",
            },
            value: {
              type: "string",
              description:
                "Specific, concise info. One sentence max. E.g. '$100 + $35 acceptance fee for under 16' or '6-8 weeks standard, 2-3 weeks expedited'",
            },
          },
          required: ["label", "value"],
          additionalProperties: false,
        },
        description:
          "2-4 short contextual facts that are NOT tasks. Only include info that doesn't belong in the task list: costs, timelines, deadlines, validity periods. NEVER duplicate anything already covered by a task or subtask.",
      },
      summary: {
        type: "string",
        description: "One encouraging sentence about the plan",
      },
      learned_facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fact: {
              type: "string",
              description:
                "A fact about the user learned from this conversation",
            },
            category: {
              type: "string",
              description:
                "Category: family, location, preferences, work, health, finance, or other",
            },
          },
          required: ["fact", "category"],
          additionalProperties: false,
        },
        description: "Any new facts about the user from the conversation.",
      },
    },
    required: ["tasks", "notices", "summary", "learned_facts"],
    additionalProperties: false,
  },
};

function getClient() {
  return wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

export async function runTaskBreakdown(
  messages: ChatMessage[],
  profileContext: string
): Promise<TaskBreakdownResult> {
  const response = await getClient().responses.create({
    model: "gpt-5.4",
    tools: [{ type: "web_search" as any }],
    input: [
      {
        role: "system",
        content: buildTaskBreakdownPrompt(profileContext),
      },
      ...messages,
    ],
    text: { format: taskBreakdownSchema },
  });

  return JSON.parse(response.output_text);
}
