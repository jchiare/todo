import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { wf } from "./workflowInit";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query("items").order("desc").collect();

    const itemsWithProgress = await Promise.all(
      items.map(async (item) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_item", (q) => q.eq("itemId", item._id))
          .collect();
        const topLevel = tasks.filter((t) => !t.parentTaskId);
        const completed = topLevel.filter((t) => t.completed).length;
        return {
          ...item,
          progress: topLevel.length > 0 ? completed / topLevel.length : 0,
          taskCount: topLevel.length,
          completedCount: completed,
        };
      })
    );

    return itemsWithProgress;
  },
});

export const get = query({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { rawInput: v.string() },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("items", {
      rawInput: args.rawInput,
      title: args.rawInput,
      status: "clarifying",
      createdAt: Date.now(),
    });

    await ctx.db.insert("messages", {
      itemId,
      role: "user",
      content: args.rawInput,
      createdAt: Date.now(),
    });

    await wf.start(ctx, internal.workflows.clarifyWorkflow, { itemId });

    return itemId;
  },
});

export const updateTitle = mutation({
  args: { id: v.id("items"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { title: args.title });
  },
});

export const setNotices = mutation({
  args: {
    id: v.id("items"),
    notices: v.array(
      v.object({
        label: v.string(),
        value: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notices: args.notices });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("items"),
    status: v.union(
      v.literal("clarifying"),
      v.literal("planning"),
      v.literal("active"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_item", (q) => q.eq("itemId", args.id))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_item", (q) => q.eq("itemId", args.id))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.id);
  },
});
