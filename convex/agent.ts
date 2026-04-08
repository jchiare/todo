"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { FillPdfResult, runPdfFillGraph } from "./agents/pdfGraph";

class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

// Internal action: fill a PDF form (called as a workflow step)
export const doFillPdf = internalAction({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<FillPdfResult> => {
    const task = await ctx.runQuery(api.tasks.getTask, { id: args.taskId });
    if (!task || !task.agentAction) {
      throw new PermanentError("Task not found or no agent action");
    }

    // Create a run record for tracing
    const runId = await ctx.runMutation(internal.agentQueries.createAgentRun, {
      taskId: args.taskId,
    });

    const facts = await ctx.runQuery(api.profile.list);
    const item = await ctx.runQuery(api.items.get, { id: task.itemId });
    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: task.itemId,
    });

    const profileStr = facts.map((f) => `${f.category}: ${f.fact}`).join("\n");
    const convoStr = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    try {
      const result = await runPdfFillGraph(
        {
          taskLabel: item?.title || task.text,
          profileStr,
          convoStr,
        },
        (blob) => ctx.storage.store(blob)
      );

      // Persist the successful run trace
      await ctx.runMutation(internal.agentQueries.completeAgentRun, {
        runId,
        status: "completed",
        events: result.traceEvents,
        fieldMapping: result.fieldMapping
          ? JSON.stringify(result.fieldMapping)
          : undefined,
        invalidFields:
          result.invalidFields.length > 0 ? result.invalidFields : undefined,
        skippedFields:
          result.skippedFields.length > 0 ? result.skippedFields : undefined,
        missingFields:
          result.missingFields.length > 0 ? result.missingFields : undefined,
      });

      return result;
    } catch (err) {
      // Persist the failed run trace
      await ctx.runMutation(internal.agentQueries.completeAgentRun, {
        runId,
        status: "failed",
        events: [],
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
});
