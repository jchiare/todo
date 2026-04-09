import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export const getArtifactUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // Verify the file exists before returning the ID for signing
    const meta = await ctx.db.system.get(args.storageId);
    if (!meta) return null;
    // Return the storageId — the client calls getSignedDownloadUrl action to get the actual URL
    return args.storageId as string;
  },
});

export const getAgentAction = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    return task?.agentAction;
  },
});

export const setAgentStatus = internalMutation({
  args: {
    taskId: v.id("tasks"),
    agentStatus: v.union(
      v.literal("ready"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error")
    ),
    agentError: v.optional(v.string()),
    artifactName: v.optional(v.string()),
    artifactStorageId: v.optional(v.id("_storage")),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { taskId, ...fields } = args;
    const task = await ctx.db.get(taskId);
    if (!task) return;

    const rest = { ...task } as Partial<Doc<"tasks">>;
    delete rest._id;
    delete rest._creationTime;
    const nextTask = rest as Omit<Doc<"tasks">, "_id" | "_creationTime">;
    nextTask.agentStatus = fields.agentStatus;

    if (fields.agentError !== undefined) nextTask.agentError = fields.agentError;
    if (fields.artifactName !== undefined) nextTask.artifactName = fields.artifactName;
    if (fields.artifactStorageId !== undefined) {
      nextTask.artifactStorageId = fields.artifactStorageId;
    }
    if (fields.completed !== undefined) nextTask.completed = fields.completed;

    if (fields.agentStatus === "running") {
      delete nextTask.agentError;
      delete nextTask.artifactName;
      delete nextTask.artifactStorageId;
      nextTask.completed = false;
    } else if (fields.agentStatus === "done") {
      delete nextTask.agentError;
      nextTask.completed = fields.completed ?? true;
    } else if (fields.agentStatus === "error") {
      delete nextTask.artifactName;
      delete nextTask.artifactStorageId;
      nextTask.completed = false;
      if (fields.agentError === undefined && !nextTask.agentError) {
        nextTask.agentError = "Something went wrong";
      }
    }

    await ctx.db.replace(taskId, nextTask);
  },
});

// ── Storage cleanup ──

/** One-off: delete all stored artifacts and clear references on tasks. */
export const purgeAllArtifacts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all tasks with stored artifacts
    const tasks = await ctx.db.query("tasks").take(500);
    let deleted = 0;
    for (const task of tasks) {
      if (task.artifactStorageId) {
        await ctx.storage.delete(task.artifactStorageId);
        await ctx.db.patch(task._id, {
          artifactStorageId: undefined,
          artifactUrl: undefined,
        });
        deleted++;
      }
    }
    // Also sweep any orphaned storage entries
    const storageEntries = await ctx.db.system.query("_storage").take(500);
    for (const entry of storageEntries) {
      await ctx.storage.delete(entry._id);
      deleted++;
    }
    console.log(`Purged ${deleted} stored artifacts`);
  },
});

// ── PDF Agent Run Tracking ──

const traceEventValidator = v.object({
  node: v.string(),
  status: v.union(v.literal("success"), v.literal("error")),
  startedAt: v.number(),
  durationMs: v.number(),
  error: v.optional(v.string()),
  tokensUsed: v.optional(v.number()),
});

export const createAgentRun = internalMutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args): Promise<Id<"pdfAgentRuns">> => {
    return await ctx.db.insert("pdfAgentRuns", {
      taskId: args.taskId,
      status: "running",
      startedAt: Date.now(),
      events: [],
    });
  },
});

export const updateAgentRunNode = internalMutation({
  args: {
    runId: v.id("pdfAgentRuns"),
    currentNode: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, { currentNode: args.currentNode });
  },
});

export const completeAgentRun = internalMutation({
  args: {
    runId: v.id("pdfAgentRuns"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    events: v.array(traceEventValidator),
    error: v.optional(v.string()),
    fieldMapping: v.optional(v.string()),
    invalidFields: v.optional(v.array(v.string())),
    skippedFields: v.optional(v.array(v.string())),
    missingFields: v.optional(v.array(v.string())),
    langsmithUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return;

    const now = Date.now();
    await ctx.db.patch(args.runId, {
      status: args.status,
      completedAt: now,
      durationMs: now - run.startedAt,
      events: args.events,
      error: args.error,
      fieldMapping: args.fieldMapping,
      invalidFields: args.invalidFields,
      skippedFields: args.skippedFields,
      missingFields: args.missingFields,
      langsmithUrl: args.langsmithUrl,
    });
  },
});

export const getAgentRun = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pdfAgentRuns")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
  },
});
