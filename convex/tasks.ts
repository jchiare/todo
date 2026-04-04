import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const getTask = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
    return tasks.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const bulkCreate = mutation({
  args: {
    itemId: v.id("items"),
    tasks: v.array(
      v.object({
        text: v.string(),
        detail: v.optional(v.string()),
        subtasks: v.array(v.string()),
        agent_action: v.optional(v.union(v.literal(""), v.literal("fill_pdf"))),
      })
    ),
  },
  handler: async (ctx, args) => {
    let sortOrder = 0;
    const agentTaskIds: Id<"tasks">[] = [];
    for (const task of args.tasks) {
      const isAgent = task.agent_action === "fill_pdf";
      const parentId = await ctx.db.insert("tasks", {
        itemId: args.itemId,
        text: task.text,
        detail: task.detail || undefined,
        sortOrder: sortOrder++,
        completed: false,
        ...(isAgent
          ? {
              agentAction: task.agent_action,
              agentStatus: "ready" as const,
            }
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
    return agentTaskIds;
  },
});

export const answerInput = mutation({
  args: { id: v.id("tasks"), value: v.string() },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task || !task.inputPrompt) return;

    // Save answer to the task
    await ctx.db.patch(args.id, {
      inputValue: args.value,
      completed: true,
    });

    // Save to profile so the AI knows this for next time
    await ctx.db.insert("profileFacts", {
      fact: `${task.inputPrompt}: ${args.value}`,
      category: "personal",
      createdAt: Date.now(),
    });

    // Check if all sibling subtasks are done → mark parent complete
    if (task.parentTaskId) {
      const siblings = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q) => q.eq("parentTaskId", task.parentTaskId))
        .collect();
      const allDone = siblings.every((s) =>
        s._id === args.id ? true : s.completed
      );
      if (allDone) {
        await ctx.db.patch(task.parentTaskId, { completed: true });
      }
    }
  },
});

export const toggle = mutation({
  args: {
    id: v.id("tasks"),
    preserveSubtaskIds: v.optional(v.array(v.id("tasks"))),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return;

    const newCompleted = !task.completed;
    await ctx.db.patch(args.id, { completed: newCompleted });

    // If completing a parent task, auto-complete all subtasks
    if (!task.parentTaskId && newCompleted) {
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q) => q.eq("parentTaskId", args.id))
        .collect();
      for (const sub of subtasks) {
        await ctx.db.patch(sub._id, { completed: true });
      }
    }

    // If unchecking a parent, restore subtasks to their prior state
    // preserveSubtaskIds = subtasks that were manually checked before the parent was checked
    if (!task.parentTaskId && !newCompleted && args.preserveSubtaskIds) {
      const preserveSet = new Set(args.preserveSubtaskIds);
      const subtasks = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q) => q.eq("parentTaskId", args.id))
        .collect();
      for (const sub of subtasks) {
        await ctx.db.patch(sub._id, { completed: preserveSet.has(sub._id) });
      }
    }

    // If this is a subtask being completed, check if all siblings are done
    if (task.parentTaskId && newCompleted) {
      const siblings = await ctx.db
        .query("tasks")
        .withIndex("by_parent", (q) => q.eq("parentTaskId", task.parentTaskId))
        .collect();
      const allDone = siblings.every((s) =>
        s._id === args.id ? newCompleted : s.completed
      );
      if (allDone) {
        await ctx.db.patch(task.parentTaskId, { completed: true });
      }
    }

    // If unchecking a subtask, uncheck parent too
    if (task.parentTaskId && !newCompleted) {
      await ctx.db.patch(task.parentTaskId, { completed: false });
    }

    // Check if all top-level tasks for the item are done
    const allTasks = await ctx.db
      .query("tasks")
      .withIndex("by_item", (q) => q.eq("itemId", task.itemId))
      .collect();
    const topLevel = allTasks.filter((t) => !t.parentTaskId);
    const allTopDone = topLevel.length > 0 && topLevel.every((t) =>
      t._id === args.id ? newCompleted : t.completed
    );

    if (allTopDone) {
      await ctx.db.patch(task.itemId, { status: "done" });
    } else {
      const item = await ctx.db.get(task.itemId);
      if (item?.status === "done") {
        await ctx.db.patch(task.itemId, { status: "active" });
      }
    }
  },
});
