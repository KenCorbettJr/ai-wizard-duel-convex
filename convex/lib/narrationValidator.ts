import { v } from "convex/values";

/** Audio narration state for a duel round. */
export const narrationValidator = v.object({
  status: v.union(
    v.literal("PENDING"),
    v.literal("READY"),
    v.literal("FAILED"),
  ),
  storageId: v.optional(v.string()), // Convex storage ID of the WAV audio
  generatedAt: v.optional(v.number()),
});
