import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("profileFacts").collect();
  },
});

export const bulkAdd = mutation({
  args: {
    facts: v.array(
      v.object({
        fact: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Deduplicate against existing facts
    const existing = await ctx.db.query("profileFacts").collect();
    const existingTexts = new Set(existing.map((f) => f.fact.toLowerCase()));

    for (const f of args.facts) {
      if (!existingTexts.has(f.fact.toLowerCase())) {
        await ctx.db.insert("profileFacts", {
          fact: f.fact,
          category: f.category,
          createdAt: Date.now(),
        });
      }
    }
  },
});
