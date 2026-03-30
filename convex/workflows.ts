import { v } from "convex/values";
import { internal } from "./_generated/api";
import { wf } from "./workflowInit";

/**
 * Clarification workflow — runs each time the user sends a message.
 *
 * Steps:
 *  1. AI clarification (asks questions or marks ready)
 *  2. Save results (title, message, learned facts)
 *  3. If ready → set status to "planning"
 *  4. AI task breakdown with ReAct loop (web search + structured output)
 *  5. Save tasks, notices, summary, facts → set status to "active"
 *     (also fires off agent workflows for automated tasks)
 */
export const clarifyWorkflow = wf.define({
  args: { itemId: v.id("items") },
  handler: async (step, args): Promise<void> => {
    // Step 1: Run AI clarification
    const result = await step.runAction(
      internal.ai.doClarification,
      { itemId: args.itemId },
      { retry: true }
    );

    // Step 2: Save clarification results
    await step.runMutation(internal.aiMutations.saveClarification, {
      itemId: args.itemId,
      title: result.title,
      message: result.message,
      learnedFacts: result.learned_facts || [],
    });

    // Step 3+: If the AI has enough info, break the goal into tasks
    if (result.ready) {
      await step.runMutation(internal.aiMutations.setItemStatus, {
        itemId: args.itemId,
        status: "planning",
      });

      // Step 4: ReAct task breakdown — model searches the web as needed,
      // then outputs structured tasks in a single call
      const breakdown = await step.runAction(
        internal.ai.doTaskBreakdown,
        { itemId: args.itemId },
        { retry: true }
      );

      // Step 5: Persist everything + start agent workflows
      await step.runMutation(internal.aiMutations.saveTaskBreakdown, {
        itemId: args.itemId,
        tasks: breakdown.tasks,
        notices: breakdown.notices || [],
        summary: breakdown.summary,
        learnedFacts: breakdown.learned_facts || [],
      });
    }
  },
});

/**
 * Agent workflow — runs for each task with an agent_action.
 *
 * Steps:
 *  1. Set status to "running"
 *  2. Execute the action (e.g. fill PDF) with retry
 *  3. Mark done with artifact info, or mark error on failure
 */
export const agentWorkflow = wf.define({
  args: { taskId: v.id("tasks") },
  handler: async (step, args): Promise<void> => {
    // Step 1: Mark as running
    await step.runMutation(internal.agentQueries.setAgentStatus, {
      taskId: args.taskId,
      agentStatus: "running",
    });

    try {
      // Step 2: Execute the agent action
      // No retry — most failures are permanent (bad URL, bad parse).
      // Transient errors (5xx) are rare and the user can re-trigger manually.
      const result = await step.runAction(
        internal.agent.doFillPdf,
        { taskId: args.taskId },
        { retry: false }
      );

      // Step 3: Mark done with artifact
      await step.runMutation(internal.agentQueries.setAgentStatus, {
        taskId: args.taskId,
        agentStatus: "done",
        completed: true,
        artifactStorageId: result.storageId,
        artifactName: result.filename,
      });

      // Step 4: If there are missing fields, create input subtasks
      if (result.missingFields && result.missingFields.length > 0) {
        const itemId = await step.runQuery(
          internal.aiMutations.getTaskItemId,
          { taskId: args.taskId }
        );
        if (itemId) {
          await step.runMutation(internal.aiMutations.createInputSubtasks, {
            parentTaskId: args.taskId,
            itemId,
            missingFields: result.missingFields,
          });
        }
      }
    } catch (e: any) {
      // Step 3 (error path): Mark failed
      await step.runMutation(internal.agentQueries.setAgentStatus, {
        taskId: args.taskId,
        agentStatus: "error",
        agentError: e.message || "Something went wrong",
      });
    }
  },
});
