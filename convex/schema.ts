import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { narrationValidator } from "./lib/narrationValidator";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("super_admin"),
    ),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    // User profile fields
    userId: v.optional(v.string()), // Unique user handle (3-20 chars, alphanumeric + underscore/hyphen)
    displayName: v.optional(v.string()), // User's chosen display name
    profileCreatedAt: v.optional(v.number()), // When profile was completed
    // Legacy subscription fields. Subscriptions are gone; these stay optional
    // until internal.migrations.clearLegacySubscriptionFields has removed them
    // from every user, then they can be deleted from the schema.
    subscriptionTier: v.optional(
      v.union(v.literal("FREE"), v.literal("PREMIUM")),
    ),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("ACTIVE"),
        v.literal("CANCELED"),
        v.literal("PAST_DUE"),
        v.literal("TRIALING"),
      ),
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.number()),
    monthlyUsage: v.optional(
      v.object({
        duelsPlayed: v.number(),
        wizardsCreated: v.number(),
        imageGenerations: v.number(),
        adsWatched: v.number(),
        resetDate: v.number(),
      }),
    ),
    imageCredits: v.number(), // Token balance
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"]),
  wizards: defineTable({
    owner: v.string(), // User ID from Clerk, "campaign" for AI opponents, or "departed" once the owner deleted their account
    name: v.string(),
    description: v.string(),
    illustrationURL: v.optional(v.string()),
    illustration: v.optional(v.string()), // Convex storage ID
    illustrationGeneratedAt: v.optional(v.number()),
    plainIllustration: v.optional(v.string()), // Convex storage ID: wizard on a plain background (reference for scene generation)
    illustrationVersion: v.optional(v.number()),
    // Portrait job in flight ("sketching" then "painting"), or "failed". Unset when idle.
    illustrationStatus: v.optional(
      v.union(
        v.literal("sketching"),
        v.literal("painting"),
        v.literal("failed"),
      ),
    ),
    illustrationRequestedAt: v.optional(v.number()),
    illustrations: v.optional(v.array(v.string())), // Array of Convex storage IDs
    isAIPowered: v.optional(v.boolean()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    // Campaign-specific fields (only for AI opponents)
    isCampaignOpponent: v.optional(v.boolean()),
    opponentNumber: v.optional(v.number()), // 1-10 for campaign opponents
    personalityTraits: v.optional(v.array(v.string())),
    spellStyle: v.optional(v.string()),
    difficulty: v.optional(
      v.union(
        v.literal("BEGINNER"),
        v.literal("INTERMEDIATE"),
        v.literal("ADVANCED"),
      ),
    ),
    luckModifier: v.optional(v.number()),
    illustrationPrompt: v.optional(v.string()),
  })
    .index("by_owner", ["owner"])
    .index("by_campaign_opponent", ["isCampaignOpponent", "opponentNumber"]),
  // Materialized all-time multiplayer record per wizard (campaign battles
  // excluded). Maintained when a duel completes so the leaderboard can read an
  // index instead of scanning every duel.
  wizardStats: defineTable({
    wizardId: v.id("wizards"),
    wins: v.number(),
    losses: v.number(),
    totalDuels: v.number(),
    winRate: v.number(),
  })
    .index("by_wizard", ["wizardId"])
    .index("by_win_rate_and_wins_and_total_duels", [
      "winRate",
      "wins",
      "totalDuels",
    ]),
  // Private AI rating of a completed multiplayer duel, used from the admin
  // dashboard to find duels worth highlighting. Scores are 1-10.
  duelRatings: defineTable({
    duelId: v.id("duels"),
    cool: v.number(),
    funny: v.number(),
    engaging: v.number(),
    unpredictable: v.number(),
    overall: v.number(), // mean of the four scores, one decimal place
    summary: v.string(), // one-sentence reason from the rater
    ratedAt: v.number(),
  })
    .index("by_duel", ["duelId"])
    .index("by_overall", ["overall"]),
  // Short vertical teaser videos of a duel, for YouTube Shorts and the duel
  // page. Built daily from the most popular duel (or on demand by an admin),
  // reviewed by an admin, then published. Teasers never show how the duel
  // ended: they stop before the deciding round. See convex/teasers.ts.
  duelTeasers: defineTable({
    duelId: v.id("duels"),
    status: v.union(
      v.literal("DRAFTING"), // Writing the script, voicing it, animating stills
      v.literal("RENDERING"), // Waiting for the video render job
      v.literal("READY"), // Rendered, waiting for an admin to review
      v.literal("PUBLISHING"), // Approved, uploading to YouTube
      v.literal("PUBLISHED"), // Live, and shown on the duel page
      v.literal("REJECTED"),
      v.literal("FAILED"),
    ),
    source: v.union(v.literal("daily"), v.literal("admin")),
    aiMotion: v.boolean(), // Animate the stills into short AI video clips
    pickScore: v.optional(v.number()),
    pickReason: v.optional(v.string()),
    title: v.optional(v.string()), // YouTube title, spoiler-free
    description: v.optional(v.string()), // YouTube description, spoiler-free
    // Voiced segments in order: hook, one per scene, then cliffhanger + call to action.
    segments: v.optional(
      v.array(
        v.object({
          kind: v.union(
            v.literal("hook"),
            v.literal("scene"),
            v.literal("outro"),
          ),
          line: v.string(), // Spoken and captioned
          roundNumber: v.optional(v.number()),
          imageStorageId: v.optional(v.string()),
          clipStorageId: v.optional(v.string()), // AI motion clip of the image
          audioStorageId: v.optional(v.string()),
          audioMs: v.optional(v.number()),
        }),
      ),
    ),
    musicStorageId: v.optional(v.string()), // AI background music (MP3)
    videoStorageId: v.optional(v.string()), // Rendered MP4
    renderStartedAt: v.optional(v.number()),
    youtubeVideoId: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    error: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_duel", ["duelId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
  duels: defineTable({
    numberOfRounds: v.union(v.number(), v.literal("TO_THE_DEATH")),
    wizards: v.array(v.id("wizards")),
    players: v.array(v.string()), // User IDs
    status: v.union(
      v.literal("WAITING_FOR_PLAYERS"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),
    currentRound: v.number(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()), // When the duel was completed
    points: v.record(v.string(), v.number()), // Dictionary of wizard ID to points
    hitPoints: v.record(v.string(), v.number()), // Dictionary of wizard ID to hit points
    needActionsFrom: v.array(v.id("wizards")),
    featuredIllustration: v.optional(v.string()),
    winners: v.optional(v.array(v.id("wizards"))),
    losers: v.optional(v.array(v.id("wizards"))),
    highlightedAt: v.optional(v.number()), // Set by an admin to feature the duel on the homepage
    shortcode: v.optional(v.string()), // 6-character shortcode for sharing
    textOnlyMode: v.optional(v.boolean()), // Whether this duel is in text-only mode due to insufficient credits
    textOnlyReason: v.optional(v.string()), // Reason for text-only mode (insufficient_credits, image_generation_failed, etc.)
    imageCreditConsumed: v.optional(v.boolean()), // Whether an image credit has been consumed for this duel
    imageCreditConsumedBy: v.optional(v.string()), // User ID who had the credit consumed for this duel
    tokensCharged: v.optional(v.array(v.string())), // Users who paid a token for this duel
    tokensRefunded: v.optional(v.boolean()), // True once those tokens have been given back
    creatorCoversEntry: v.optional(v.boolean()), // Creator pays the joiner's token too (gifted entry)
    isCampaignBattle: v.optional(v.boolean()), // Excludes from leaderboards and watchable duels
    rematchDuelId: v.optional(v.id("duels")), // Set when a player requests a rematch of this duel
    chatEnabled: v.optional(v.boolean()), // Duelist chat. Missing means on; a duelist can switch it off mid-duel
    forfeitedBy: v.optional(v.id("wizards")), // Set when the duel ended because this wizard's player forfeited
    // Private challenge: only this player can join, with this wizard. They
    // accept or decline it; nobody else can join by code.
    challengedUserId: v.optional(v.string()),
    challengedWizardId: v.optional(v.id("wizards")),
    // Set when a sponsor paid for at least one player's entry
    sponsorshipId: v.optional(v.id("sponsorships")),
  })
    .index("by_status", ["status"])
    .index("by_challenged_user_and_status", ["challengedUserId", "status"])
    .index("by_player", ["players"])
    .index("by_shortcode", ["shortcode"])
    .index("by_completed_at", ["completedAt"])
    .index("by_highlighted_at", ["highlightedAt"]),
  // Per-duel notes for the illustrations. `scale` is a fixed sentence about the
  // wizards' relative heights, repeated in every image so sizes stay consistent.
  // Written once, the first time an image of the duel is generated.
  duelArtNotes: defineTable({
    duelId: v.id("duels"),
    scale: v.string(),
  }).index("by_duel", ["duelId"]),
  // What the battlefield looks like after each battle round (craters, ice,
  // weather...), written by the art director and fed into the next round so the
  // environment builds up over the duel. Battle rounds hide the arena stands.
  duelBattlefields: defineTable({
    duelId: v.id("duels"),
    roundNumber: v.number(),
    description: v.string(),
  }).index("by_duel_and_round", ["duelId", "roundNumber"]),
  duelRounds: defineTable({
    duelId: v.id("duels"),
    roundNumber: v.number(),
    type: v.union(
      v.literal("SPELL_CASTING"),
      v.literal("COUNTER_SPELL"),
      v.literal("FINAL_ROUND"),
      v.literal("CONCLUSION"),
    ),
    spells: v.optional(
      v.record(
        v.string(),
        v.object({
          description: v.string(),
          castBy: v.id("wizards"),
          timestamp: v.number(),
        }),
      ),
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
      }),
    ),
    status: v.union(
      v.literal("WAITING_FOR_SPELLS"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
    ),
    narration: v.optional(narrationValidator), // Audio narration of the outcome
    // Round image generation state. Absent once the image is stored, for
    // text-only duels, and for rounds from before this was tracked.
    illustrationStatus: v.optional(
      v.union(v.literal("PENDING"), v.literal("FAILED")),
    ),
  }).index("by_duel", ["duelId"]),
  // Duelist chat. `afterRound` is how many rounds had resolved when a message
  // was sent, and `postDuel` marks messages sent after the duel ended, so a
  // replay can show each one only once the viewer reaches it.
  duelMessages: defineTable({
    duelId: v.id("duels"),
    userId: v.string(), // Clerk subject of the sender
    body: v.string(),
    wizardId: v.optional(v.id("wizards")), // The sender's wizard in this duel
    afterRound: v.number(),
    postDuel: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_duel_and_created_at", ["duelId", "createdAt"])
    .index("by_duel_and_user_and_created_at", [
      "duelId",
      "userId",
      "createdAt",
    ]),
  // Emoji reactions to a wizard's spell in a round. One row per viewer, spell
  // and emoji; reacting again with the same emoji removes it.
  spellReactions: defineTable({
    duelId: v.id("duels"),
    roundId: v.id("duelRounds"),
    wizardId: v.id("wizards"), // Whose spell
    userId: v.string(), // Clerk subject of the viewer reacting
    emoji: v.string(), // One of SPELL_REACTIONS in lib/spellReactions.ts
    createdAt: v.number(),
  })
    .index("by_duel", ["duelId"])
    .index("by_round_and_user", ["roundId", "userId"])
    .index("by_user", ["userId"]),
  duelLobby: defineTable({
    userId: v.string(), // Clerk user ID
    wizardId: v.id("wizards"),
    joinedAt: v.number(),
    duelType: v.union(v.number(), v.literal("TO_THE_DEATH")), // Number of rounds or "TO_THE_DEATH"
    status: v.union(
      v.literal("WAITING"), // Waiting for match
      v.literal("MATCHED"), // Found a match, duel being created
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
      v.literal("INTERSTITIAL"),
    ),
    placement: v.union(
      v.literal("WIZARD_PAGE"),
      v.literal("DUEL_PAGE"),
      v.literal("CREDIT_REWARD"),
    ),
    action: v.union(
      v.literal("IMPRESSION"),
      v.literal("CLICK"),
      v.literal("COMPLETION"),
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
      v.literal("EXPIRED"),
    ),
    amount: v.number(),
    source: v.union(
      v.literal("SIGNUP_BONUS"),
      v.literal("AD_REWARD"),
      v.literal("PREMIUM_GRANT"),
      v.literal("ADMIN_GRANT"),
      v.literal("DUEL_ENTRY"),
      v.literal("DUEL_REFUND"),
      v.literal("WIZARD_IMAGE"),
      v.literal("WIZARD_IMAGE_REFUND"),
      v.literal("PURCHASE"),
      v.literal("REFERRAL_BONUS"),
    ),
    relatedAdId: v.optional(v.id("adInteractions")),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
  // A player who signed up through someone's invite link. Both get a token
  // bonus once, when the new player finishes their first duel.
  referrals: defineTable({
    referrerId: v.string(), // Clerk ID of the player who shared the link
    referredId: v.string(), // Clerk ID of the new player
    createdAt: v.number(),
    // Set when the new player finished their first duel and got their bonus.
    rewardedAt: v.optional(v.number()),
    // Whether the referrer got theirs too (false once they hit a cap).
    referrerRewarded: v.optional(v.boolean()),
  })
    .index("by_referred", ["referredId"])
    .index("by_referrer", ["referrerId"]),
  // Token pack purchases through Stripe Checkout. A row is created when
  // checkout starts and completed (tokens granted) once, by the webhook.
  tokenPurchases: defineTable({
    userId: v.string(), // Clerk ID of the buyer
    packId: v.string(),
    tokens: v.number(),
    amountCents: v.number(),
    currency: v.string(),
    stripeSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(v.literal("PENDING"), v.literal("COMPLETED")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["stripeSessionId"])
    .index("by_user", ["userId"]),
  // One row per AI provider call, used to track generation costs
  aiUsage: defineTable({
    feature: v.string(), // e.g. generate_duel_round, generate_wizard_image
    provider: v.string(),
    model: v.string(),
    kind: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("video"),
      v.literal("audio"),
    ),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    imageCount: v.optional(v.number()),
    costUsd: v.number(), // Estimated, see lib/aiPricing.ts
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    success: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_user_id_and_created_at", ["userId", "createdAt"]),
  // One row per text the Watcher rejected. Each row is a strike.
  moderationEvents: defineTable({
    userId: v.string(), // Clerk subject
    surface: v.union(
      v.literal("spell"),
      v.literal("wizard"),
      v.literal("profile"),
      v.literal("chat"),
    ),
    category: v.string(), // See WATCHER_CATEGORIES in lib/watcherRules.ts
    source: v.union(v.literal("wordlist"), v.literal("ai")),
    text: v.string(), // The rejected text, truncated, for admin review
    reason: v.optional(v.string()), // The AI's note for reviewers
    duelId: v.optional(v.id("duels")),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_user_id_and_created_at", ["userId", "createdAt"]),
  cosmeticItems: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("SPELL_EFFECT"),
      v.literal("WIZARD_ACCESSORY"),
      v.literal("BACKGROUND"),
      v.literal("ANIMATION"),
    ),
    price: v.number(), // Price in cents
    rarity: v.union(
      v.literal("COMMON"),
      v.literal("RARE"),
      v.literal("EPIC"),
      v.literal("LEGENDARY"),
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
      v.literal("CANCELLED"),
    ),
    participants: v.array(v.string()), // User IDs
    winners: v.optional(
      v.array(
        v.object({
          userId: v.string(),
          position: v.number(),
          prize: v.number(),
        }),
      ),
    ),
  }),
  transactions: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("SUBSCRIPTION"),
      v.literal("COSMETIC_PURCHASE"),
      v.literal("TOURNAMENT_ENTRY"),
      v.literal("AI_CREDITS"),
      v.literal("TOURNAMENT_PRIZE"),
    ),
    amount: v.number(), // In cents
    stripePaymentIntentId: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("REFUNDED"),
    ),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_payment", ["stripePaymentIntentId"]),

  // Individual wizard campaign progress (now season-specific)
  wizardCampaignProgress: defineTable({
    wizardId: v.id("wizards"),
    userId: v.string(),
    seasonId: v.id("campaignSeasons"), // Which season this progress is for
    currentOpponent: v.number(), // Next opponent to face (1-10, or 11 if completed)
    defeatedOpponents: v.array(v.number()), // Array of defeated opponent numbers
    hasCompletionRelic: v.boolean(), // Whether wizard earned the season's relic
    createdAt: v.number(),
    lastBattleAt: v.optional(v.number()),
  })
    .index("by_wizard", ["wizardId"])
    .index("by_user", ["userId"])
    .index("by_season", ["seasonId"])
    .index("by_wizard_season", ["wizardId", "seasonId"])
    .index("by_user_season", ["userId", "seasonId"]),

  // Campaign battle records (separate from multiplayer duels)
  campaignBattles: defineTable({
    wizardId: v.id("wizards"),
    userId: v.string(),
    opponentNumber: v.number(),
    duelId: v.id("duels"), // Links to duel system but marked as campaign
    status: v.union(
      v.literal("IN_PROGRESS"),
      v.literal("WON"),
      v.literal("LOST"),
    ),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    seasonId: v.optional(v.id("campaignSeasons")), // Link to specific season
  })
    .index("by_wizard", ["wizardId"])
    .index("by_duel", ["duelId"])
    .index("by_user_opponent", ["userId", "opponentNumber"])
    .index("by_season", ["seasonId"]),

  // Campaign seasons - campaigns with different opponents and rewards
  campaignSeasons: defineTable({
    name: v.string(), // e.g., "Season of Fire", "Winter's Challenge"
    description: v.string(),
    status: v.union(
      v.literal("ACTIVE"), // Currently running
      v.literal("ARCHIVED"), // Old season, hidden from UI
    ),
    // Relic reward for completing this season
    completionRelic: v.object({
      name: v.string(), // e.g., "Phoenix Feather", "Frost Crown"
      description: v.string(),
      luckBonus: v.number(), // Luck bonus (usually +1)
      iconUrl: v.optional(v.string()), // Optional icon for the relic
    }),
    // Season-specific opponent configuration - direct opponent selection
    opponents: v.array(v.id("wizards")), // Array of wizard IDs in the order they should be fought (1-10)
    maxParticipants: v.optional(v.number()), // Optional limit on participants
    isDefault: v.optional(v.boolean()), // Whether this is the default/fallback season
    createdAt: v.number(),
    createdBy: v.string(), // Admin who created the season
  })
    .index("by_status", ["status"])
    .index("by_default", ["isDefault"]),
  // Everything we tell a player about. Each row shows in their in-app inbox,
  // and is also pushed to any devices they've turned push on for.
  notifications: defineTable({
    userId: v.string(), // Clerk subject of the recipient
    type: v.union(
      v.literal("YOUR_TURN"),
      v.literal("DUEL_RESULT"),
      v.literal("TEASER_READY"), // Admins: a duel teaser video is waiting for review
      v.literal("DUEL_CHALLENGE"), // Another player challenged one of your wizards, or answered your challenge
    ),
    title: v.string(),
    body: v.string(),
    url: v.string(), // In-app path opened when tapped, e.g. /duels/<id>
    duelId: v.optional(v.id("duels")),
    // Stops the same event notifying twice (e.g. "turn:<duel>:<round>:<user>")
    dedupeKey: v.optional(v.string()),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    pushStatus: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("SENT"),
        v.literal("NO_DEVICES"),
        v.literal("FAILED"),
      ),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read_at", ["userId", "readAt"])
    .index("by_dedupe_key", ["dedupeKey"]),
  // Web Push subscriptions, one per browser/device a player turned push on in.
  pushSubscriptions: defineTable({
    userId: v.string(), // Clerk subject
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    lastSuccessAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
  // One row per onlooker per duel (duelists aren't counted). viewerId is
  // "user:<clerk id>" or "anon:<browser id>", as in convex/presence.ts.
  // One row per player per live (waiting or in-progress) duel, removed when
  // the duel ends. Maintained by lib/duelParticipants.syncDuelParticipants so
  // "my live duels" is an indexed read rather than a scan of every live duel.
  duelParticipants: defineTable({
    duelId: v.id("duels"),
    userId: v.string(),
  })
    .index("by_duel", ["duelId"])
    .index("by_user", ["userId"]),
  duelViews: defineTable({
    duelId: v.id("duels"),
    viewerId: v.string(),
    visits: v.number(), // Visits at least VISIT_GAP_MS apart
    firstViewedAt: v.number(),
    lastViewedAt: v.number(),
  })
    .index("by_duel_and_viewer", ["duelId", "viewerId"])
    .index("by_viewer", ["viewerId"]),
  // Per-duel popularity totals, kept off the duel document so counting a
  // view doesn't re-run every query that reads the duel.
  duelViewStats: defineTable({
    duelId: v.id("duels"),
    views: v.number(), // Every visit
    uniqueViewers: v.number(),
    signedInViewers: v.number(), // Of uniqueViewers, how many had accounts
    liveViews: v.number(), // Visits while the duel was in progress
    peakOnlookers: v.number(), // Most onlookers in the arena at once
    lastViewedAt: v.number(),
  })
    .index("by_duel", ["duelId"])
    .index("by_views", ["views"])
    .index("by_unique_viewers", ["uniqueViewers"])
    .index("by_live_views", ["liveViews"])
    .index("by_peak_onlookers", ["peakOnlookers"])
    .index("by_last_viewed_at", ["lastViewedAt"]),
  // A sponsor paying for players' duels for a while. While one is running,
  // duel entries and campaign battles cost players no tokens. Windows never
  // overlap, so at most one runs at a time.
  sponsorships: defineTable({
    sponsorName: v.string(),
    message: v.optional(v.string()), // Shown in the site banner
    url: v.optional(v.string()), // The sponsor's site (https only)
    logoStorageId: v.optional(v.id("_storage")), // PNG, JPEG, WebP or SVG
    startsAt: v.number(),
    endsAt: v.number(),
    maxEntries: v.optional(v.number()), // Budget: total entries the sponsor covers
    dailyEntriesPerPlayer: v.optional(v.number()), // Fair-use limit per player per UTC day
    entriesUsed: v.number(),
    endedEarlyAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_ends_at", ["endsAt"]),
  // Sponsored entries per player per UTC day, for the fair-use limit and
  // the admin's player count.
  sponsorshipUsage: defineTable({
    sponsorshipId: v.id("sponsorships"),
    userId: v.string(),
    day: v.string(), // YYYY-MM-DD, UTC
    entries: v.number(),
  })
    .index("by_sponsorship_user_day", ["sponsorshipId", "userId", "day"])
    .index("by_sponsorship", ["sponsorshipId"]),
});
