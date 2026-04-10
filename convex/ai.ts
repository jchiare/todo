"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { runClarification } from "../src/lib/agents/clarification";
import { runTaskBreakdown } from "../src/lib/agents/taskBreakdown";
import type { ClarificationResult, TaskBreakdownResult } from "../src/lib/agents/types";

function buildProfileContext(facts: { fact: string; category: string }[]): string {
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

// ---------------------------------------------------------------------------
// Internal actions (called as workflow steps)
// ---------------------------------------------------------------------------

export const doClarification = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args): Promise<ClarificationResult> => {
    const item = await ctx.runQuery(api.items.get, { id: args.itemId });
    if (!item) throw new Error("Item not found");

    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: args.itemId,
    });
    const facts = await ctx.runQuery(api.profile.list);
    const profileContext = buildProfileContext(facts);

    const inputMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    return runClarification(inputMessages, profileContext);
  },
});

export const doTaskBreakdown = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args): Promise<TaskBreakdownResult> => {
    const item = await ctx.runQuery(api.items.get, { id: args.itemId });
    if (!item) throw new Error("Item not found");

    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: args.itemId,
    });
    const facts = await ctx.runQuery(api.profile.list);
    const profileContext = buildProfileContext(facts);

    const inputMessages = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    return runTaskBreakdown(inputMessages, profileContext);
  },
});
