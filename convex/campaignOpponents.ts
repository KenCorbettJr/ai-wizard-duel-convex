import { v } from "convex/values";

// Campaign opponent difficulty levels
export const CAMPAIGN_DIFFICULTIES = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;

export type CampaignDifficulty =
  (typeof CAMPAIGN_DIFFICULTIES)[keyof typeof CAMPAIGN_DIFFICULTIES];

// Predefined campaign opponents data
export const CAMPAIGN_OPPONENTS_DATA = [
  // Beginner opponents (1-3): -2 luck modifier
  {
    opponentNumber: 1,
    name: "Pip the Apprentice",
    description:
      "A nervous young wizard still learning the basics of magic. Often fumbles spells and second-guesses every decision. Despite their inexperience, they show genuine enthusiasm for magical combat.",
    personalityTraits: ["nervous", "eager", "inexperienced", "fumbling"],
    spellStyle: "basic elemental magic",
    difficulty: CAMPAIGN_DIFFICULTIES.BEGINNER,
    luckModifier: -2,
    illustrationPrompt:
      "A young nervous wizard apprentice with oversized robes, holding a small wooden wand, surrounded by sparkling but unstable magical energy, fantasy art style",
  },
  {
    opponentNumber: 2,
    name: "Bumbling Boris",
    description:
      "A well-meaning but clumsy wizard who graduated last in his class. His spells often backfire in amusing ways, but his determination never wavers. Known for accidentally helping his opponents.",
    personalityTraits: [
      "clumsy",
      "well-meaning",
      "accident-prone",
      "determined",
    ],
    spellStyle: "unpredictable mishap magic",
    difficulty: CAMPAIGN_DIFFICULTIES.BEGINNER,
    luckModifier: -2,
    illustrationPrompt:
      "A bumbling middle-aged wizard with disheveled robes and crooked hat, magical sparks flying chaotically around him, comical fantasy art style",
  },
  {
    opponentNumber: 3,
    name: "Nervous Nellie",
    description:
      "An anxious wizard who overthinks every spell and constantly worries about making mistakes. Her cautious nature leads to weak, hesitant magic that rarely reaches its full potential.",
    personalityTraits: ["anxious", "overthinking", "cautious", "hesitant"],
    spellStyle: "defensive protection magic",
    difficulty: CAMPAIGN_DIFFICULTIES.BEGINNER,
    luckModifier: -2,
    illustrationPrompt:
      "A worried female wizard with wide eyes, clutching her spellbook tightly, surrounded by faint protective magical barriers, soft fantasy art style",
  },

  // Intermediate opponents (4-7): 0 luck modifier
  {
    opponentNumber: 4,
    name: "Steady Sam",
    description:
      "A reliable wizard who favors consistent, well-practiced spells over flashy magic. His methodical approach makes him predictable but effective. Never rushes into battle unprepared.",
    personalityTraits: ["methodical", "reliable", "consistent", "prepared"],
    spellStyle: "traditional combat magic",
    difficulty: CAMPAIGN_DIFFICULTIES.INTERMEDIATE,
    luckModifier: 0,
    illustrationPrompt:
      "A composed middle-aged wizard in neat robes, holding a polished staff, surrounded by orderly geometric magical patterns, classic fantasy art style",
  },
  {
    opponentNumber: 5,
    name: "Mystic Marina",
    description:
      "A water-specialized wizard who flows like the tides in combat. Her spells ebb and surge with natural rhythm, adapting to the battlefield like water finding its course.",
    personalityTraits: ["fluid", "adaptive", "rhythmic", "natural"],
    spellStyle: "water and ice magic",
    difficulty: CAMPAIGN_DIFFICULTIES.INTERMEDIATE,
    luckModifier: 0,
    illustrationPrompt:
      "An elegant female wizard with flowing blue robes, surrounded by swirling water and ice crystals, oceanic magical aura, mystical fantasy art style",
  },
  {
    opponentNumber: 6,
    name: "Firebrand Felix",
    description:
      "A passionate fire wizard whose emotions fuel his magic. His spells burn bright and hot, matching his fiery temperament. Quick to anger but equally quick to respect worthy opponents.",
    personalityTraits: ["passionate", "fiery", "emotional", "respectful"],
    spellStyle: "fire and heat magic",
    difficulty: CAMPAIGN_DIFFICULTIES.INTERMEDIATE,
    luckModifier: 0,
    illustrationPrompt:
      "A dynamic male wizard with red and orange robes, flames dancing around his hands, intense fiery eyes, dramatic fantasy art style",
  },
  {
    opponentNumber: 7,
    name: "Scholar Sage",
    description:
      "An intellectual wizard who approaches magic like a science. Every spell is calculated and precise, backed by years of theoretical study. Prefers elegant solutions to brute force.",
    personalityTraits: ["intellectual", "calculated", "precise", "elegant"],
    spellStyle: "arcane theory magic",
    difficulty: CAMPAIGN_DIFFICULTIES.INTERMEDIATE,
    luckModifier: 0,
    illustrationPrompt:
      "A scholarly wizard with spectacles and elaborate robes covered in magical symbols, surrounded by floating books and glowing equations, academic fantasy art style",
  },

  // Advanced opponents (8-10): +2 luck modifier
  {
    opponentNumber: 8,
    name: "Shadowweaver Vex",
    description:
      "A master of dark magic who manipulates shadows and illusions with deadly precision. Their true form is often obscured, making them unpredictable and dangerous in combat.",
    personalityTraits: ["mysterious", "manipulative", "precise", "dangerous"],
    spellStyle: "shadow and illusion magic",
    difficulty: CAMPAIGN_DIFFICULTIES.ADVANCED,
    luckModifier: 2,
    illustrationPrompt:
      "A mysterious wizard shrouded in dark robes and shadows, face partially hidden, tendrils of dark magic swirling around them, ominous fantasy art style",
  },
  {
    opponentNumber: 9,
    name: "Stormcaller Zara",
    description:
      "A legendary wizard who commands the fury of storms. Lightning crackles at her fingertips and thunder follows her voice. Her magic is as wild and powerful as the tempests she controls.",
    personalityTraits: ["legendary", "commanding", "wild", "powerful"],
    spellStyle: "storm and lightning magic",
    difficulty: CAMPAIGN_DIFFICULTIES.ADVANCED,
    luckModifier: 2,
    illustrationPrompt:
      "A powerful female wizard with storm-gray robes, lightning crackling around her, standing amid swirling clouds and wind, epic fantasy art style",
  },
  {
    opponentNumber: 10,
    name: "Archmage Eternus",
    description:
      "The final challenge - an ancient archmage whose mastery of magic spans centuries. Every spell is a masterwork of power and finesse. Defeating them proves true magical prowess.",
    personalityTraits: ["ancient", "masterful", "powerful", "wise"],
    spellStyle: "ancient arcane mastery",
    difficulty: CAMPAIGN_DIFFICULTIES.ADVANCED,
    luckModifier: 2,
    illustrationPrompt:
      "An ancient powerful archmage with elaborate golden robes and a magnificent staff, surrounded by complex magical circles and cosmic energy, legendary fantasy art style",
  },
];

// Validator for campaign opponent data
export const campaignOpponentValidator = v.object({
  opponentNumber: v.number(),
  name: v.string(),
  description: v.string(),
  personalityTraits: v.array(v.string()),
  spellStyle: v.string(),
  difficulty: v.union(
    v.literal("BEGINNER"),
    v.literal("INTERMEDIATE"),
    v.literal("ADVANCED")
  ),
  luckModifier: v.number(),
  illustrationPrompt: v.string(),
});

import { mutation, query } from "./_generated/server";

/**
 * Seed a single campaign opponent (for testing)
 */
export const seedCampaignOpponent = mutation({
  args: campaignOpponentValidator,
  returns: v.id("campaignOpponents"),
  handler: async (ctx, args) => {
    // Validate opponent number range
    if (args.opponentNumber < 1 || args.opponentNumber > 10) {
      throw new Error("Opponent number must be between 1 and 10");
    }

    // Check for existing opponent with same number
    const existing = await ctx.db
      .query("campaignOpponents")
      .withIndex("by_opponent_number", (q) =>
        q.eq("opponentNumber", args.opponentNumber)
      )
      .unique();

    if (existing) {
      throw new Error(
        `Campaign opponent ${args.opponentNumber} already exists`
      );
    }

    // Insert the opponent
    return await ctx.db.insert("campaignOpponents", args);
  },
});

/**
 * Get a specific campaign opponent by number
 */
export const getCampaignOpponent = query({
  args: { opponentNumber: v.number() },
  returns: v.union(
    v.object({
      _id: v.id("campaignOpponents"),
      _creationTime: v.number(),
      opponentNumber: v.number(),
      name: v.string(),
      description: v.string(),
      personalityTraits: v.array(v.string()),
      spellStyle: v.string(),
      difficulty: v.union(
        v.literal("BEGINNER"),
        v.literal("INTERMEDIATE"),
        v.literal("ADVANCED")
      ),
      luckModifier: v.number(),
      illustrationPrompt: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, { opponentNumber }) => {
    return await ctx.db
      .query("campaignOpponents")
      .withIndex("by_opponent_number", (q) =>
        q.eq("opponentNumber", opponentNumber)
      )
      .unique();
  },
});

/**
 * Get all campaign opponents
 */
export const getAllCampaignOpponents = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("campaignOpponents"),
      _creationTime: v.number(),
      opponentNumber: v.number(),
      name: v.string(),
      description: v.string(),
      personalityTraits: v.array(v.string()),
      spellStyle: v.string(),
      difficulty: v.union(
        v.literal("BEGINNER"),
        v.literal("INTERMEDIATE"),
        v.literal("ADVANCED")
      ),
      luckModifier: v.number(),
      illustrationPrompt: v.string(),
    })
  ),
  handler: async (ctx) => {
    const opponents = await ctx.db
      .query("campaignOpponents")
      .withIndex("by_opponent_number")
      .collect();

    return opponents.sort((a, b) => a.opponentNumber - b.opponentNumber);
  },
});
