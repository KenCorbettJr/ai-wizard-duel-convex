"use node";

/**
 * The Watcher oversees everything players write. Every public write of
 * player text (spells, wizards, profile names) goes through an action here,
 * which checks the text and only then calls the internal mutation that saves
 * it. A rejected attempt costs nothing: no turn, no tokens.
 *
 * Checks run in order: active cooldown, local wordlist, then an AI classifier.
 * If the AI is unreachable the Watcher fails closed without giving a strike.
 */

import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v, type Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { z } from "genkit/beta";
import { generateObject } from "./aiTextGeneration";
import { isEmulatorMode, isTestMode } from "./mocks/mockServices";
import { captureServerEvent } from "./lib/posthog";
import {
  WATCHER_CATEGORIES,
  MODERATION_SYSTEM_PROMPT,
  buildModerationPrompt,
  buildRejection,
  buildCooldownRejection,
  buildUnavailableRejection,
  checkWordlist,
  containsContactInfo,
  COOLDOWN_MS,
  COOLDOWN_STRIKES,
  strikeWeight,
  type WatcherCategory,
  type WatcherRejection,
  type WatcherSurface,
} from "./lib/watcherRules";

const rejectionValidator = v.object({
  category: v.string(),
  message: v.string(),
  hint: v.string(),
  strikeCount: v.number(),
  cooldownUntil: v.optional(v.number()),
});
export type WatcherRejectionResult = Infer<typeof rejectionValidator>;

const rejectedValidator = v.object({
  ok: v.literal(false),
  rejection: rejectionValidator,
});

const verdictSchema = z.object({
  allowed: z.boolean(),
  category: z.enum([...WATCHER_CATEGORIES, "none"]),
  reason: z.string(),
});

type Field = { label: string; text: string };

async function requireUser(ctx: ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

async function classify(
  ctx: ActionCtx,
  userId: string,
  surface: WatcherSurface,
  fields: Field[],
): Promise<z.infer<typeof verdictSchema>> {
  // Mocked AI returns arbitrary values, so tests and the emulator rely on the
  // wordlist alone.
  if (isTestMode() || isEmulatorMode()) {
    return { allowed: true, category: "none", reason: "" };
  }
  return await generateObject(
    buildModerationPrompt(surface, fields),
    verdictSchema,
    MODERATION_SYSTEM_PROMPT,
    // generateObject treats 0 as unset, so use a tiny positive temperature.
    { temperature: 0.01, maxTokens: 256 },
    { spanName: "watcher_moderation", usageCtx: ctx, distinctId: userId },
  );
}

/**
 * Ask the Watcher about some player text. Returns null when it's allowed, or
 * the rejection to show. Rule breaks are recorded as strikes.
 */
async function consultWatcher(
  ctx: ActionCtx,
  userId: string,
  surface: WatcherSurface,
  fields: Field[],
  duelId?: Id<"duels">,
): Promise<WatcherRejection | null> {
  const present = fields.filter((f) => f.text.trim());
  if (present.length === 0) return null;

  const now = Date.now();
  const status = await ctx.runQuery(internal.moderationEvents.getStrikeStatus, {
    userId,
    now,
  });
  if (status.cooldownUntil) {
    return buildCooldownRejection(status.strikeCount, status.cooldownUntil);
  }

  let category: WatcherCategory | null = null;
  let source: "wordlist" | "ai" = "wordlist";
  let reason: string | undefined;

  for (const field of present) {
    category = checkWordlist(field.text);
    // Chat goes straight to another player, so links, emails and phone
    // numbers are stopped without asking the AI.
    if (!category && surface === "chat" && containsContactInfo(field.text)) {
      category = "personal_info";
    }
    if (category) break;
  }

  if (!category) {
    try {
      const verdict = await classify(ctx, userId, surface, present);
      if (!verdict.allowed) {
        category = verdict.category === "none" ? "other" : verdict.category;
        source = "ai";
        reason = verdict.reason;
      }
    } catch (error) {
      console.error("Watcher moderation failed:", error);
      return buildUnavailableRejection(status.strikeCount);
    }
  }

  if (!category) return null;

  await ctx.runMutation(internal.moderationEvents.record, {
    userId,
    surface,
    category,
    source,
    text: present.map((f) => `${f.label}: ${f.text}`).join("\n"),
    reason,
    duelId,
    createdAt: now,
  });

  // This strike may be the one that starts a cooldown.
  const strikeCount = status.strikeCount + strikeWeight(category);
  const silencedUntil =
    strikeCount >= COOLDOWN_STRIKES ? now + COOLDOWN_MS : null;

  await captureServerEvent(
    "watcher_rejected",
    { surface, category, source, strike_count: strikeCount },
    userId,
  );

  return buildRejection(category, strikeCount, silencedUntil);
}

function rejected(rejection: WatcherRejection) {
  return { ok: false as const, rejection };
}

export const castSpell = action({
  args: {
    duelId: v.id("duels"),
    wizardId: v.id("wizards"),
    spellDescription: v.string(),
  },
  returns: v.union(v.object({ ok: v.literal(true) }), rejectedValidator),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const rejection = await consultWatcher(
      ctx,
      userId,
      "spell",
      [{ label: "Spell", text: args.spellDescription }],
      args.duelId,
    );
    if (rejection) return rejected(rejection);

    await ctx.runMutation(internal.duels.castSpell, args);
    return { ok: true as const };
  },
});

/** A duelist's chat message. Checked like a spell, then posted. */
export const sendChatMessage = action({
  args: { duelId: v.id("duels"), body: v.string() },
  returns: v.union(v.object({ ok: v.literal(true) }), rejectedValidator),
  handler: async (ctx, { duelId, body }) => {
    const userId = await requireUser(ctx);
    const problem = await ctx.runQuery(internal.duelChat.checkCanSendText, {
      duelId,
      userId,
      body,
      now: Date.now(),
    });
    if (problem) throw new ConvexError(problem);

    const rejection = await consultWatcher(
      ctx,
      userId,
      "chat",
      [{ label: "Chat message", text: body }],
      duelId,
    );
    if (rejection) return rejected(rejection);

    await ctx.runMutation(internal.duelChat.postText, { duelId, userId, body });
    return { ok: true as const };
  },
});

export const createWizard = action({
  args: { name: v.string(), description: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), wizardId: v.id("wizards") }),
    rejectedValidator,
  ),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    // Cheap duplicate-name check first, so it doesn't cost an AI call.
    await ctx.runQuery(internal.wizards.assertNameFreeForOwner, {
      owner: userId,
      name: args.name,
    });
    const rejection = await consultWatcher(ctx, userId, "wizard", [
      { label: "Wizard name", text: args.name },
      { label: "Wizard description", text: args.description },
    ]);
    if (rejection) return rejected(rejection);

    const wizardId: Id<"wizards"> = await ctx.runMutation(
      internal.wizards.createWizard,
      args,
    );
    return { ok: true as const, wizardId };
  },
});

export const updateWizard = action({
  args: {
    wizardId: v.id("wizards"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.union(v.object({ ok: v.literal(true) }), rejectedValidator),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    if (args.name !== undefined) {
      await ctx.runQuery(internal.wizards.assertNameFreeForOwner, {
        owner: userId,
        name: args.name,
        exceptId: args.wizardId,
      });
    }
    const rejection = await consultWatcher(ctx, userId, "wizard", [
      { label: "Wizard name", text: args.name ?? "" },
      { label: "Wizard description", text: args.description ?? "" },
    ]);
    if (rejection) return rejected(rejection);

    await ctx.runMutation(internal.wizards.updateWizard, args);
    return { ok: true as const };
  },
});

const profileResultValidator = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
  rejection: v.optional(rejectionValidator),
});

export const setUserId = action({
  args: { userId: v.string(), displayName: v.optional(v.string()) },
  returns: profileResultValidator,
  handler: async (ctx, args): Promise<Infer<typeof profileResultValidator>> => {
    const userId = await requireUser(ctx);
    const rejection = await consultWatcher(ctx, userId, "profile", [
      { label: "Username", text: args.userId },
      { label: "Display name", text: args.displayName ?? "" },
    ]);
    if (rejection) {
      return { success: false, error: rejection.message, rejection };
    }
    return await ctx.runMutation(internal.userProfiles.setUserId, args);
  },
});

export const updateUserProfile = action({
  args: { displayName: v.string() },
  returns: profileResultValidator,
  handler: async (ctx, args): Promise<Infer<typeof profileResultValidator>> => {
    const userId = await requireUser(ctx);
    const rejection = await consultWatcher(ctx, userId, "profile", [
      { label: "Display name", text: args.displayName },
    ]);
    if (rejection) {
      return { success: false, error: rejection.message, rejection };
    }
    return await ctx.runMutation(internal.userProfiles.updateUserProfile, args);
  },
});
