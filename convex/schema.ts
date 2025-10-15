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
    // User profile fields
    userId: v.optional(v.string()), // Unique user handle (3-20 chars, alphanumeric + underscore/hyphen)
    displayName: v.optional(v.string()), // User's chosen display name
    profileCreatedAt: v.optional(v.number()), // When profile was completed
    subscriptionTier: v.union(v.literal("FREE"), v.literal("PREMIUM")),
    subscriptionStatus: v.union(
      v.literal("ACTIVE"),
      v.literal("CANCELED"),
      v.literal("PAST_DUE"),
      v.literal("TRIALING")
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.number()),
    imageCredits: v.number(), // Remaining image generation credits
    monthlyUsage: v.object({
      duelsPlayed: v.number(),
      wizardsCreated: v.number(),
      imageGenerations: v.number(),
      adsWatched: v.number(),
      resetDate: v.number(), // When usage resets
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_user_id", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),
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
    textOnlyMode: v.optional(v.boolean()), // Whether this duel is in text-only mode due to insufficient credits
    textOnlyReason: v.optional(v.string()), // Reason for text-only mode (insufficient_credits, image_generation_failed, etc.)
    imageCreditConsumed: v.optional(v.boolean()), // Whether an image credit has been consumed for this duel
    imageCreditConsumedBy: v.optional(v.string()), // User ID who had the credit consumed for this duel
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
  imageCreditTransactions: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("EARNED"),
      v.literal("CONSUMED"),
      v.literal("GRANTED"),
      v.literal("EXPIRED")
    ),
    amount: v.number(),
    source: v.union(
      v.literal("SIGNUP_BONUS"),
      v.literal("AD_REWARD"),
      v.literal("PREMIUM_GRANT"),
      v.literal("ADMIN_GRANT")
    ),
    relatedAdId: v.optional(v.id("adInteractions")),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  cosmeticItems: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("SPELL_EFFECT"),
      v.literal("WIZARD_ACCESSORY"),
      v.literal("BACKGROUND"),
      v.literal("ANIMATION")
    ),
    price: v.number(), // Price in cents
    rarity: v.union(
      v.literal("COMMON"),
      v.literal("RARE"),
      v.literal("EPIC"),
      v.literal("LEGENDARY")
    ),
    previewImage: v.optional(v.string()),
    isActive: v.boolean(),
    premiumOnly: v.boolean(),
  }),
  userInventory: defineTable({
    userId: v.string(), // Clerk ID
    itemId: v.id("cosmeticItems"),
    purchasedAt: v.number(),
    equipped: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "itemId"]),
  tournaments: defineTable({
    name: v.string(),
    description: v.string(),
    entryFee: v.number(), // In cents, 0 for free tournaments
    prizePool: v.number(), // In cents
    maxParticipants: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal("UPCOMING"),
      v.literal("ACTIVE"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    participants: v.array(v.string()), // User IDs
    winners: v.optional(
      v.array(
        v.object({
          userId: v.string(),
          position: v.number(),
          prize: v.number(),
        })
      )
    ),
  }),
  transactions: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("SUBSCRIPTION"),
      v.literal("COSMETIC_PURCHASE"),
      v.literal("TOURNAMENT_ENTRY"),
      v.literal("AI_CREDITS"),
      v.literal("TOURNAMENT_PRIZE")
    ),
    amount: v.number(), // In cents
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("REFUNDED")
    ),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_payment", ["stripePaymentIntentId"]),
});
