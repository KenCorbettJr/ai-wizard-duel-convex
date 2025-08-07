import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  wizards: defineTable({
    owner: v.string(), // User ID from Clerk
    name: v.string(),
    description: v.string(),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()), // Convex storage ID
    illustrationGeneratedAt: v.optional(v.number()),
    illustrationVersion: v.optional(v.number()),
    illustrations: v.optional(v.array(v.string())), // Array of Convex storage IDs
    isAIPowered: v.optional(v.boolean()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
  }).index("by_owner", ["owner"]),
  duels: defineTable({
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    wizards: v.array(v.id("wizards")),
    players: v.array(v.string()), // User IDs
    status: v.union(
      v.literal("WAITING_FOR_PLAYERS"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    currentRound: v.number(),
    createdAt: v.number(),
    points: v.record(v.string(), v.number()), // Dictionary of wizard ID to points
    hitPoints: v.record(v.string(), v.number()), // Dictionary of wizard ID to hit points
    needActionsFrom: v.array(v.id("wizards")),
    sessionId: v.optional(v.string()),
    featuredIllustration: v.optional(v.string()),
    winners: v.optional(v.array(v.id("wizards"))),
    losers: v.optional(v.array(v.id("wizards"))),
    shortcode: v.optional(v.string()), // 6-character shortcode for sharing
  })
    .index("by_status", ["status"])
    .index("by_player", ["players"])
    .index("by_session", ["sessionId"])
    .index("by_shortcode", ["shortcode"]),
  duelRounds: defineTable({
    duelId: v.id("duels"),
    roundNumber: v.number(),
    type: v.union(
      v.literal("SPELL_CASTING"),
      v.literal("COUNTER_SPELL"),
      v.literal("FINAL_ROUND"),
      v.literal("CONCLUSION")
    ),
    spells: v.optional(
      v.record(
        v.string(),
        v.object({
          description: v.string(),
          castBy: v.id("wizards"),
          timestamp: v.number(),
        })
      )
    ), // Dictionary of wizard ID to spell
    outcome: v.optional(
      v.object({
        narrative: v.string(),
        result: v.optional(v.string()),
        illustration: v.optional(v.string()),
        illustrationPrompt: v.optional(v.string()),
        pointsAwarded: v.optional(v.record(v.string(), v.number())), // Dictionary of wizard ID to points
        healthChange: v.optional(v.record(v.string(), v.number())), // Dictionary of wizard ID to health change
      })
    ),
    status: v.union(
      v.literal("WAITING_FOR_SPELLS"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED")
    ),
  }).index("by_duel", ["duelId"]),
});
