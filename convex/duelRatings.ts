"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { z } from "genkit/beta";
import { generateObject } from "./aiTextGeneration";
import {
  RATING_SYSTEM_PROMPT,
  buildRatingPrompt,
  normalizeRating,
} from "./lib/duelRating";

const RatingSchema = z.object({
  cool: z.number().describe("1-10 integer. Spectacle and memorable imagery."),
  funny: z.number().describe("1-10 integer. Humor and absurdity."),
  engaging: z
    .number()
    .describe("1-10 integer. Story, stakes, momentum and finish."),
  unpredictable: z
    .number()
    .describe("1-10 integer. Surprise, twists and unexpected interactions."),
  summary: z
    .string()
    .describe("One sentence: the best moment or the main weakness."),
});

/** Rates a completed duel and stores the result. Safe to run again: it replaces the previous rating. */
export const rateDuel = internalAction({
  args: { duelId: v.id("duels") },
  returns: v.null(),
  handler: async (ctx, { duelId }) => {
    const context = await ctx.runQuery(
      internal.duelRatingsData.getRatingContext,
      {
        duelId,
      },
    );
    if (!context) return null;

    try {
      const raw = await generateObject(
        buildRatingPrompt(context),
        RatingSchema,
        RATING_SYSTEM_PROMPT,
        { temperature: 0.3, maxTokens: 800 },
        { spanName: "rate_duel", usageCtx: ctx },
      );
      const { scores, overall } = normalizeRating(raw ?? {});
      const summary =
        typeof raw?.summary === "string" ? raw.summary.slice(0, 400) : "";
      await ctx.runMutation(internal.duelRatingsData.saveRating, {
        duelId,
        ...scores,
        overall,
        summary,
      });
    } catch (error) {
      console.error(`Duel rating failed for ${duelId}:`, error);
    }
    return null;
  },
});
