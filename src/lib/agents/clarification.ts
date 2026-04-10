import OpenAI from "openai";
import { wrapOpenAI } from "braintrust";
import { buildClarificationPrompt } from "./prompts/ai/clarificationPrompt";
import type { ClarificationResult, ChatMessage } from "./types";

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
        description:
          "Facts about the user extracted from their messages. E.g. if they mention a baby, store that. If they mention a city, store that.",
      },
    },
    required: ["title", "ready", "message", "learned_facts"],
    additionalProperties: false,
  },
};

function getClient() {
  return wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
}

export async function runClarification(
  messages: ChatMessage[],
  profileContext: string
): Promise<ClarificationResult> {
  const response = await getClient().responses.create({
    model: "gpt-5.4",
    input: [
      {
        role: "system",
        content: buildClarificationPrompt(profileContext),
      },
      ...messages,
    ],
    text: { format: clarificationSchema },
  });

  return JSON.parse(response.output_text);
}
