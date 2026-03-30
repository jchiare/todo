import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const getArtifactUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
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
    const update: Record<string, any> = { agentStatus: fields.agentStatus };
    if (fields.agentError !== undefined) update.agentError = fields.agentError;
    if (fields.artifactName !== undefined) update.artifactName = fields.artifactName;
    if (fields.artifactStorageId !== undefined)
      update.artifactStorageId = fields.artifactStorageId;
    if (fields.completed !== undefined) update.completed = fields.completed;
    await ctx.db.patch(taskId, update);
  },
});
