import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("super_admin")
    ),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
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
    featuredIllustration: v.optional(v.string()),
    winners: v.optional(v.array(v.id("wizards"))),
    losers: v.optional(v.array(v.id("wizards"))),
    shortcode: v.optional(v.string()), // 6-character shortcode for sharing
  })
    .index("by_status", ["status"])
    .index("by_player", ["players"])
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
        luckRolls: v.optional(v.record(v.string(), v.number())), // Dictionary of wizard ID to luck roll (1-20)
      })
    ),
    status: v.union(
      v.literal("WAITING_FOR_SPELLS"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED")
    ),
  }).index("by_duel", ["duelId"]),
  duelLobby: defineTable({
    userId: v.string(), // Clerk user ID
    wizardId: v.id("wizards"),
    joinedAt: v.number(),
    duelType: v.union(v.number(), v.literal("TO_THE_DEATH")), // Number of rounds or "TO_THE_DEATH"
    status: v.union(
      v.literal("WAITING"), // Waiting for match
      v.literal("MATCHED") // Found a match, duel being created
    ),
    matchedWith: v.optional(v.id("duelLobby")), // Reference to the matched lobby entry
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_wizard", ["wizardId"]),
  adInteractions: defineTable({
    userId: v.optional(v.string()), // Null for anonymous users
    sessionId: v.string(), // Track anonymous sessions
    adType: v.union(
      v.literal("DISPLAY_BANNER"),
      v.literal("VIDEO_REWARD"),
      v.literal("INTERSTITIAL")
    ),
    placement: v.union(
      v.literal("WIZARD_PAGE"),
      v.literal("DUEL_PAGE"),
      v.literal("CREDIT_REWARD")
    ),
    action: v.union(
      v.literal("IMPRESSION"),
      v.literal("CLICK"),
      v.literal("COMPLETION")
    ),
    revenue: v.optional(v.number()), // Revenue in cents
    adNetworkId: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_placement", ["placement"]),
});
