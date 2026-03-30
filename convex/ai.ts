"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";

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
          content: `You are a calm, encouraging task assistant for an app called "Done."
Your tone is warm but concise — like a thoughtful friend, not a corporate bot.

The user has entered a goal. Your job:
1. Generate a clean, short title for this goal (3-6 words).
2. Decide if you need to ask clarifying questions to break this into concrete tasks.
3. If you need more info, ask 1-2 specific questions (never more than 2 at a time).
4. If you have enough information, set ready=true.
5. Extract any facts you learn about the user (family members, location, preferences, etc.)

IMPORTANT: Use what you already know about the user to SKIP questions you can answer yourself. If a fact is in the user profile — their location, family members, dates, preferences — do NOT ask about it. Assume it. Only ask when information is genuinely missing and unanswerable from context.

For example, if the user has a newborn in their profile and asks about a passport, do NOT ask "is this their first passport?" — obviously yes. If you know their travel date, do NOT ask about timing — just pick the option that works.

Keep questions practical and grounded. Don't over-think simple goals.
For straightforward goals (e.g., "take out the trash"), skip questions entirely — set ready=true.
When in doubt, set ready=true and make reasonable assumptions rather than asking.${profileContext}`,
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
    tasks: { text: string; detail: string; subtasks: string[]; agent_action: string }[];
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
          content: `You are a calm task planner for an app called "Done."
Your job: search the web for specific, actionable information about the user's goal, then break it into concrete tasks.

RESEARCH FIRST — use web search to find:
- Official websites and direct URLs
- Requirements and documents needed
- Local offices, addresses, phone numbers
- Current fees and processing times
- Any forms that need to be filled out
Be thorough — find real URLs and details, not generic advice.

THEN create a structured task breakdown following these rules:
- Create 2-7 top-level tasks (prefer fewer, more meaningful steps).
- Each task can have 0-4 subtasks (only if the task has distinct sub-steps).
- Tasks should be specific and completable (not vague).
- Order tasks in the sequence they should be done.
- Write tasks as short imperative phrases ("Take photos of the bike", not "You should take photos").
- Don't include trivial steps the user obviously knows.
- The "detail" field is a SOURCE REFERENCE — just a URL, phone number, or address. Never a sentence. Never repeat the task text. Leave it empty if there's no specific source.
- Extract any new facts about the user.

CRITICAL — notices vs tasks:
- Notices are for CONTEXT ONLY: fees, processing times, validity periods, deadlines.
- If something is actionable, it's a task — NOT a notice.
- NEVER put the same information in both a notice and a task/subtask.
- Keep notices short — one sentence each, 2-4 notices max.

AGENT TASKS — you can automate certain tasks:
- Set agent_action to "fill_pdf" for tasks that involve filling out an official/government form (e.g. DS-11, W-4, I-9). The agent will download the PDF, fill it with known user info, and provide a download link.
- Only use fill_pdf when the form is a well-known fillable PDF you're confident exists online.
- Agent tasks run automatically — the user gets the completed artifact without lifting a finger.
- For the task text, phrase it as the outcome: "Fill out DS-11 application" not "Download and fill the PDF".${profileContext}`,
        },
        ...inputMessages,
      ],
      text: { format: taskBreakdownSchema },
    });

    return JSON.parse(response.output_text);
  },
});

