import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { wf } from "./workflowInit";

export const getTaskItemId = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    return task?.itemId;
  },
});

export const addAssistantMessage = internalMutation({
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

// Create input subtasks for missing form fields under the agent task
export const createInputSubtasks = internalMutation({
  args: {
    parentTaskId: v.id("tasks"),
    itemId: v.id("items"),
    missingFields: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current max sortOrder for subtasks under this parent
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_parent", (q) => q.eq("parentTaskId", args.parentTaskId))
      .collect();
    let sortOrder = existing.length > 0
      ? Math.max(...existing.map((t) => t.sortOrder)) + 1
      : 1000; // start high to sort after regular subtasks

    for (const field of args.missingFields) {
      await ctx.db.insert("tasks", {
        itemId: args.itemId,
        text: field,
        parentTaskId: args.parentTaskId,
        sortOrder: sortOrder++,
        completed: false,
        inputPrompt: field,
      });
    }
  },
});

export const saveClarification = internalMutation({
  args: {
    itemId: v.id("items"),
    title: v.string(),
    message: v.string(),
    learnedFacts: v.array(
      v.object({ fact: v.string(), category: v.string() })
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { title: args.title });

    await ctx.db.insert("messages", {
      itemId: args.itemId,
      role: "assistant",
      content: args.message,
      createdAt: Date.now(),
    });

    if (args.learnedFacts.length > 0) {
      const existing = await ctx.db.query("profileFacts").collect();
      const existingTexts = new Set(existing.map((f) => f.fact.toLowerCase()));
      for (const f of args.learnedFacts) {
        if (!existingTexts.has(f.fact.toLowerCase())) {
          await ctx.db.insert("profileFacts", {
            fact: f.fact,
            category: f.category,
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});

export const setItemStatus = internalMutation({
  args: {
    itemId: v.id("items"),
    status: v.union(
      v.literal("clarifying"),
      v.literal("planning"),
      v.literal("active"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, { status: args.status });
  },
});

export const saveTaskBreakdown = internalMutation({
  args: {
    itemId: v.id("items"),
    tasks: v.array(
      v.object({
        text: v.string(),
        detail: v.string(),
        subtasks: v.array(v.string()),
        agent_action: v.string(),
      })
    ),
    notices: v.array(v.object({ label: v.string(), value: v.string() })),
    summary: v.string(),
    learnedFacts: v.array(
      v.object({ fact: v.string(), category: v.string() })
    ),
  },
  handler: async (ctx, args) => {
    let sortOrder = 0;
    const agentTaskIds: any[] = [];
    for (const task of args.tasks) {
      const isAgent = task.agent_action && task.agent_action.trim() !== "";
      const parentId = await ctx.db.insert("tasks", {
        itemId: args.itemId,
        text: task.text,
        detail: task.detail || undefined,
        sortOrder: sortOrder++,
        completed: false,
        ...(isAgent
          ? { agentAction: task.agent_action, agentStatus: "ready" as const }
          : {}),
      });
      if (isAgent) agentTaskIds.push(parentId);

      for (const subtask of task.subtasks) {
        await ctx.db.insert("tasks", {
          itemId: args.itemId,
          text: subtask,
          parentTaskId: parentId,
          sortOrder: sortOrder++,
          completed: false,
        });
      }
    }

    if (args.notices.length > 0) {
      await ctx.db.patch(args.itemId, { notices: args.notices });
    }

    await ctx.db.insert("messages", {
      itemId: args.itemId,
      role: "assistant",
      content: args.summary,
      createdAt: Date.now(),
    });

    if (args.learnedFacts.length > 0) {
      const existing = await ctx.db.query("profileFacts").collect();
      const existingTexts = new Set(existing.map((f) => f.fact.toLowerCase()));
      for (const f of args.learnedFacts) {
        if (!existingTexts.has(f.fact.toLowerCase())) {
          await ctx.db.insert("profileFacts", {
            fact: f.fact,
            category: f.category,
            createdAt: Date.now(),
          });
        }
      }
    }

    await ctx.db.patch(args.itemId, { status: "active" });

    for (const taskId of agentTaskIds) {
      await wf.start(ctx, internal.workflows.agentWorkflow, { taskId });
    }
  },
});
