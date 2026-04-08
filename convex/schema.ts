import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    rawInput: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("clarifying"),
      v.literal("planning"),
      v.literal("active"),
      v.literal("done")
    ),
    notices: v.optional(
      v.array(
        v.object({
          label: v.string(),
          value: v.string(),
        })
      )
    ),
    createdAt: v.number(),
  }),

  tasks: defineTable({
    itemId: v.id("items"),
    text: v.string(),
    detail: v.optional(v.string()),
    parentTaskId: v.optional(v.id("tasks")),
    sortOrder: v.number(),
    completed: v.boolean(),
    // Agent task fields
    agentAction: v.optional(v.string()),
    agentStatus: v.optional(
      v.union(
        v.literal("ready"),
        v.literal("running"),
        v.literal("done"),
        v.literal("error")
      )
    ),
    agentError: v.optional(v.string()),
    artifactUrl: v.optional(v.string()),
    artifactName: v.optional(v.string()),
    artifactStorageId: v.optional(v.id("_storage")),
    // Input subtask fields — user fills in missing form info
    inputPrompt: v.optional(v.string()),
    inputValue: v.optional(v.string()),
  })
    .index("by_item", ["itemId"])
    .index("by_parent", ["parentTaskId"]),

  messages: defineTable({
    itemId: v.id("items"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_item", ["itemId"]),

  profileFacts: defineTable({
    fact: v.string(),
    category: v.string(),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  pdfAgentRuns: defineTable({
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    currentNode: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    // Trace events from each node
    events: v.array(
      v.object({
        node: v.string(),
        status: v.union(v.literal("success"), v.literal("error")),
        startedAt: v.number(),
        durationMs: v.number(),
        error: v.optional(v.string()),
        tokensUsed: v.optional(v.number()),
      })
    ),
    // The final field mapping the AI produced
    fieldMapping: v.optional(v.string()),
    // Fields the AI returned that didn't match any real PDF field
    invalidFields: v.optional(v.array(v.string())),
    // Fields that existed but failed to write (wrong type, etc.)
    skippedFields: v.optional(v.array(v.string())),
    // Fields the AI couldn't fill due to missing info
    missingFields: v.optional(v.array(v.string())),
    // LangSmith trace URL for deep-dive
    langsmithUrl: v.optional(v.string()),
  }).index("by_task", ["taskId"]),
});
