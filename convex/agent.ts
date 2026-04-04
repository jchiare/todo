"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
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

    const facts = await ctx.runQuery(api.profile.list);
    const item = await ctx.runQuery(api.items.get, { id: task.itemId });
    const messages = await ctx.runQuery(api.messages.listByItem, {
      itemId: task.itemId,
    });

    const profileStr = facts.map((f) => `${f.category}: ${f.fact}`).join("\n");
    const convoStr = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    return await runPdfFillGraph(
      {
        taskLabel: item?.title || task.text,
        profileStr,
        convoStr,
      },
      (blob) => ctx.storage.store(blob)
    );
  },
});
