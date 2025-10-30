import { v } from "convex/values";

// Different opponent sets for different seasons
export const SEASONAL_OPPONENT_SETS = {
  classic: {
    name: "Classic Opponents",
    description: "The original set of campaign opponents",
    // Uses the existing CAMPAIGN_OPPONENTS_DATA from campaignOpponents.ts
  },

  elemental: {
    name: "Elemental Masters",
    description: "Wizards who have mastered the primal elements",
    opponents: [
      // Beginner opponents (1-3): -2 luck modifier
      {
        opponentNumber: 1,
        name: "Ember the Spark",
        description:
          "A young fire wizard whose flames flicker uncertainly. Still learning to control the heat within, often singeing their own robes in excitement.",
        personalityTraits: [
          "enthusiastic",
          "impulsive",
          "warm-hearted",
          "clumsy",
        ],
        spellStyle: "unstable fire magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A young fire wizard with singed robes and small flames dancing around their hands, bright orange hair, cheerful expression, fantasy art style",
      },
      {
        opponentNumber: 2,
        name: "Puddle the Uncertain",
        description:
          "A water wizard who struggles with confidence. Their spells often evaporate before reaching their target, leaving only damp disappointment.",
        personalityTraits: ["uncertain", "gentle", "flowing", "hesitant"],
        spellStyle: "weak water magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A timid water wizard with blue robes, small water droplets floating uncertainly around them, worried expression, soft fantasy art style",
      },
      {
        opponentNumber: 3,
        name: "Breeze the Whisper",
        description:
          "An air wizard whose magic is barely more than a gentle breeze. Speaks in whispers and moves like a leaf on the wind.",
        personalityTraits: ["quiet", "gentle", "airy", "soft-spoken"],
        spellStyle: "gentle wind magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A delicate air wizard with flowing light robes, gentle breezes swirling around them, ethereal appearance, peaceful fantasy art style",
      },

      // Intermediate opponents (4-7): 0 luck modifier
      {
        opponentNumber: 4,
        name: "Stone the Steadfast",
        description:
          "An earth wizard as reliable as bedrock. Their magic is slow but inexorable, like the movement of mountains over ages.",
        personalityTraits: ["steady", "reliable", "patient", "enduring"],
        spellStyle: "solid earth magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A sturdy earth wizard with brown and green robes, rocks and crystals orbiting around them, determined expression, grounded fantasy art style",
      },
      {
        opponentNumber: 5,
        name: "Frost the Precise",
        description:
          "An ice wizard whose magic is as sharp and clear as winter air. Every spell is calculated with crystalline precision.",
        personalityTraits: ["precise", "calculating", "cool", "methodical"],
        spellStyle: "precise ice magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "An elegant ice wizard with crystalline blue robes, ice shards and snowflakes swirling in perfect patterns, focused expression, winter fantasy art style",
      },
      {
        opponentNumber: 6,
        name: "Bolt the Dynamic",
        description:
          "A lightning wizard crackling with energy. Quick to act and quicker to strike, their magic moves at the speed of thought.",
        personalityTraits: ["energetic", "quick", "dynamic", "electric"],
        spellStyle: "swift lightning magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A dynamic lightning wizard with electric blue robes, lightning bolts crackling around them, energetic pose, electric fantasy art style",
      },
      {
        opponentNumber: 7,
        name: "Bloom the Harmonious",
        description:
          "A nature wizard in perfect harmony with the living world. Plants grow at their touch and animals gather to hear their voice.",
        personalityTraits: ["harmonious", "nurturing", "natural", "balanced"],
        spellStyle: "nature growth magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A nature wizard with green robes covered in living vines, flowers blooming around them, serene expression, natural fantasy art style",
      },

      // Advanced opponents (8-10): +2 luck modifier
      {
        opponentNumber: 8,
        name: "Inferno the Consuming",
        description:
          "A master of destructive fire whose flames burn with the heat of stars. Their magic consumes everything in its path.",
        personalityTraits: [
          "consuming",
          "intense",
          "destructive",
          "passionate",
        ],
        spellStyle: "devastating fire magic",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "A powerful fire wizard wreathed in intense flames, red and gold robes, eyes glowing like embers, dramatic fire fantasy art style",
      },
      {
        opponentNumber: 9,
        name: "Tsunami the Overwhelming",
        description:
          "A water wizard who commands the fury of the deepest oceans. Their magic crashes down like tidal waves.",
        personalityTraits: ["overwhelming", "deep", "powerful", "relentless"],
        spellStyle: "oceanic devastation magic",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "A mighty water wizard surrounded by massive waves, deep blue robes, commanding presence, oceanic power fantasy art style",
      },
      {
        opponentNumber: 10,
        name: "Tempest the Primordial",
        description:
          "The ultimate elemental master who wields all elements in perfect unity. A force of nature given form and consciousness.",
        personalityTraits: [
          "primordial",
          "unified",
          "elemental",
          "transcendent",
        ],
        spellStyle: "unified elemental mastery",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "An ancient elemental master with robes showing all elements, fire, water, earth, and air swirling in harmony around them, transcendent fantasy art style",
      },
    ],
  },

  shadow: {
    name: "Shadow Realm",
    description: "Dark wizards from the realm of shadows and nightmares",
    opponents: [
      // Beginner opponents (1-3): -2 luck modifier
      {
        opponentNumber: 1,
        name: "Shade the Timid",
        description:
          "A young shadow wizard afraid of their own darkness. Their shadows are more like gentle gray mist than true darkness.",
        personalityTraits: ["timid", "afraid", "gentle", "uncertain"],
        spellStyle: "weak shadow magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A nervous young shadow wizard with gray robes, faint shadows around them, worried expression, soft dark fantasy art style",
      },
      {
        opponentNumber: 2,
        name: "Gloom the Melancholy",
        description:
          "A shadow wizard perpetually sad and distracted. Their magic reflects their mood - weak and unfocused.",
        personalityTraits: ["melancholy", "distracted", "sad", "unfocused"],
        spellStyle: "unfocused darkness magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A melancholy shadow wizard with dark robes, wispy shadows around them, sad expression, moody fantasy art style",
      },
      {
        opponentNumber: 3,
        name: "Mist the Confused",
        description:
          "A shadow wizard who can't tell reality from illusion. Often casts spells on their own shadow by mistake.",
        personalityTraits: [
          "confused",
          "disoriented",
          "mistaken",
          "bewildered",
        ],
        spellStyle: "confused illusion magic",
        difficulty: "BEGINNER" as const,
        luckModifier: -2,
        illustrationPrompt:
          "A confused shadow wizard with swirling mist around them, puzzled expression, reality-bending fantasy art style",
      },

      // Intermediate opponents (4-7): 0 luck modifier
      {
        opponentNumber: 4,
        name: "Dusk the Balanced",
        description:
          "A shadow wizard who walks the line between light and dark. Their magic draws power from twilight's balance.",
        personalityTraits: ["balanced", "twilight", "measured", "dual-natured"],
        spellStyle: "twilight balance magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A balanced shadow wizard with twilight-colored robes, light and shadow in harmony around them, serene expression, dusk fantasy art style",
      },
      {
        opponentNumber: 5,
        name: "Whisper the Silent",
        description:
          "A shadow wizard who speaks only through magic. Their spells move like silent death through the darkness.",
        personalityTraits: ["silent", "stealthy", "mysterious", "deadly"],
        spellStyle: "silent death magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A silent shadow wizard with dark hooded robes, moving shadows around them, mysterious expression, stealth fantasy art style",
      },
      {
        opponentNumber: 6,
        name: "Phantom the Elusive",
        description:
          "A shadow wizard who exists between worlds. Their magic phases in and out of reality like a ghost.",
        personalityTraits: ["elusive", "ghostly", "phasing", "otherworldly"],
        spellStyle: "phasing phantom magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A ghostly shadow wizard partially transparent, ethereal robes, phasing in and out of reality, spectral fantasy art style",
      },
      {
        opponentNumber: 7,
        name: "Nightmare the Haunting",
        description:
          "A shadow wizard who feeds on fear. Their magic brings the darkest dreams into waking reality.",
        personalityTraits: [
          "haunting",
          "fearsome",
          "dream-walking",
          "terrifying",
        ],
        spellStyle: "nightmare manifestation magic",
        difficulty: "INTERMEDIATE" as const,
        luckModifier: 0,
        illustrationPrompt:
          "A nightmare wizard with dark robes covered in shifting dream imagery, fear-inducing aura, terrifying fantasy art style",
      },

      // Advanced opponents (8-10): +2 luck modifier
      {
        opponentNumber: 8,
        name: "Void the Consuming",
        description:
          "A shadow wizard who commands the emptiness between stars. Their magic devours light itself.",
        personalityTraits: [
          "consuming",
          "void-touched",
          "light-devouring",
          "cosmic",
        ],
        spellStyle: "void consumption magic",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "A void wizard with robes like starless space, darkness consuming light around them, cosmic horror fantasy art style",
      },
      {
        opponentNumber: 9,
        name: "Eclipse the Absolute",
        description:
          "A shadow wizard who can blot out the sun itself. Their magic brings eternal darkness to any battlefield.",
        personalityTraits: [
          "absolute",
          "eclipse-bringing",
          "sun-blocking",
          "eternal",
        ],
        spellStyle: "eclipse dominion magic",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "An eclipse wizard with solar eclipse imagery on robes, blocking out light, absolute darkness around them, celestial fantasy art style",
      },
      {
        opponentNumber: 10,
        name: "Oblivion the Eternal",
        description:
          "The master of all shadows, older than memory itself. Their magic is the darkness that existed before the first light.",
        personalityTraits: [
          "eternal",
          "primordial",
          "all-consuming",
          "ancient",
        ],
        spellStyle: "primordial darkness mastery",
        difficulty: "ADVANCED" as const,
        luckModifier: 2,
        illustrationPrompt:
          "An ancient shadow master with robes of pure darkness, reality bending around them, primordial darkness, ultimate fantasy art style",
      },
    ],
  },
};

// Validator for seasonal opponent data
export const seasonalOpponentValidator = v.object({
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
import { checkSuperAdminAccess } from "./auth.utils";

/**
 * Seed opponents for a specific season/opponent set
 */
export const seedSeasonalOpponents = mutation({
  args: {
    opponentSet: v.string(),
    replaceExisting: v.optional(v.boolean()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    count: v.number(),
  }),
  handler: async (ctx, { opponentSet, replaceExisting = false }) => {
    // Check admin access
    const adminAccess = await checkSuperAdminAccess(ctx);
    if (!adminAccess.hasAccess) {
      throw new Error("Access denied: Super admin privileges required");
    }

    // Get the opponent set data
    const setData =
      SEASONAL_OPPONENT_SETS[
        opponentSet as keyof typeof SEASONAL_OPPONENT_SETS
      ];
    if (!setData) {
      throw new Error(`Unknown opponent set: ${opponentSet}`);
    }

    // For classic set, use existing opponents
    if (opponentSet === "classic") {
      return {
        success: true,
        message: "Classic opponents already exist in the system",
        count: 10,
      };
    }

    if (!("opponents" in setData) || !setData.opponents) {
      throw new Error(`Opponent set ${opponentSet} has no opponent data`);
    }

    // If replacing existing, delete current opponents for this set
    if (replaceExisting) {
      const existingSetOpponents = await ctx.db
        .query("wizards")
        .withIndex("by_campaign_opponent", (q) =>
          q.eq("isCampaignOpponent", true)
        )
        .collect();

      // Delete opponents that match this set (we'll need to track this somehow)
      // For now, we'll just warn about replacement
      console.log(
        `Warning: replaceExisting=true but no mechanism to identify set-specific opponents. Found ${existingSetOpponents.length} existing opponents.`
      );
    }

    // Check if any opponents already exist
    const existingOpponents = await ctx.db
      .query("wizards")
      .withIndex("by_campaign_opponent", (q) =>
        q.eq("isCampaignOpponent", true)
      )
      .collect();

    if (existingOpponents.length > 0 && !replaceExisting) {
      return {
        success: false,
        message: `Campaign opponents already exist. Use replaceExisting=true to replace them.`,
        count: existingOpponents.length,
      };
    }

    // Insert new opponents
    let insertedCount = 0;
    for (const opponent of setData.opponents) {
      await ctx.db.insert("wizards", {
        owner: "campaign",
        name: opponent.name,
        description: opponent.description,
        isAIPowered: true,
        wins: 0,
        losses: 0,
        illustrationVersion: 1,
        // Campaign-specific fields
        isCampaignOpponent: true,
        opponentNumber: opponent.opponentNumber,
        personalityTraits: opponent.personalityTraits,
        spellStyle: opponent.spellStyle,
        difficulty: opponent.difficulty,
        luckModifier: opponent.luckModifier,
        illustrationPrompt: opponent.illustrationPrompt,
      });
      insertedCount++;
    }

    return {
      success: true,
      message: `Successfully seeded ${insertedCount} opponents for ${setData.name}`,
      count: insertedCount,
    };
  },
});

/**
 * Get available opponent sets
 */
export const getAvailableOpponentSets = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      name: v.string(),
      description: v.string(),
    })
  ),
  handler: async () => {
    return Object.entries(SEASONAL_OPPONENT_SETS).map(([key, data]) => ({
      key,
      name: data.name,
      description: data.description,
    }));
  },
});
