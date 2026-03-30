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
});
