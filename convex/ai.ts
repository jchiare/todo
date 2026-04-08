"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";
import { buildClarificationPrompt } from "./agents/prompts/ai/clarificationPrompt";
import { buildTaskBreakdownPrompt } from "./agents/prompts/ai/taskBreakdownPrompt";

function getClient() {
  return wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

async function getProfileContext(ctx: any): Promise<string> {
  const facts = await ctx.runQuery(api.profile.list);
  if (facts.length === 0) return "";

  const byCategory = new Map<string, string[]>();
  for (const f of facts) {
    const list = byCategory.get(f.category) || [];
    list.push(f.fact);
    byCategory.set(f.category, list);
  }

  let context = "\n\nWhat you know about this user:\n";
  for (const [category, items] of byCategory) {
    context += `- ${category}: ${items.join("; ")}\n`;
  }
  return context;
}

const clarificationSchema = {
  type: "json_schema" as const,
  name: "clarification",
  strict: true,
  schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Clean 3-6 word title for the goal",
      },
      ready: {
        type: "boolean",
        description:
          "True if enough info to generate tasks, false if questions needed",
      },
      message: {
        type: "string",
        description:
          "If ready=false: 1-2 clarifying questions. If ready=true: brief encouraging confirmation.",
      },
      learned_facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fact: {
              type: "string",
              description: "A fact about the user learned from this conversation",
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
        description:
          "Facts about the user extracted from their messages. E.g. if they mention a baby, store that. If they mention a city, store that.",
      },
    },
    required: ["title", "ready", "message", "learned_facts"],
    additionalProperties: false,
  },
};

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
              description: "A fact about the user learned from this conversation",
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

// ---------------------------------------------------------------------------
// Internal actions (called as workflow steps)
// ---------------------------------------------------------------------------

export const doClarification = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args): Promise<{
    title: string;
    ready: boolean;
    message: string;
    learned_facts: { fact: string; category: string }[];
  }> => {
    const item = await ctx.runQuery(api.items.get, { id: args.itemId });
    if (!item) throw new Error("Item not found");

    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: args.itemId,
    });
    const profileContext = await getProfileContext(ctx);

    const inputMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await getClient().responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: buildClarificationPrompt(profileContext),
        },
        ...inputMessages,
      ],
      text: { format: clarificationSchema },
    });

    return JSON.parse(response.output_text);
  },
});

export const doTaskBreakdown = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args): Promise<{
    tasks: { text: string; detail: string; subtasks: string[]; agent_action: "" | "fill_pdf" }[];
    notices: { label: string; value: string }[];
    summary: string;
    learned_facts: { fact: string; category: string }[];
  }> => {
    const item = await ctx.runQuery(api.items.get, { id: args.itemId });
    if (!item) throw new Error("Item not found");

    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: args.itemId,
    });
    const profileContext = await getProfileContext(ctx);

    const inputMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Single ReAct call: the model searches the web as needed, then produces
    // the structured task breakdown. No manual two-pass orchestration.
    const response = await getClient().responses.create({
      model: "gpt-5.4",
      tools: [{ type: "web_search" as any }],
      input: [
        {
          role: "system",
          content: buildTaskBreakdownPrompt(profileContext),
        },
        ...inputMessages,
      ],
      text: { format: taskBreakdownSchema },
    });

    return JSON.parse(response.output_text);
  },
});
