import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const getArtifactUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
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
