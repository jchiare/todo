import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { wf } from "./workflowInit";

export const listByItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
  },
});

export const send = mutation({
  args: { itemId: v.id("items"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      itemId: args.itemId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    const item = await ctx.db.get(args.itemId);
    if (item?.status === "clarifying") {
      await wf.start(ctx, internal.workflows.clarifyWorkflow, {
        itemId: args.itemId,
      });
    }
  },
});

export const addAssistant = mutation({
  args: { itemId: v.id("items"), content: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      itemId: args.itemId,
      role: "assistant",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});
