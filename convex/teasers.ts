/**
 * Duel teasers: short vertical videos (YouTube Shorts) that build up a duel
 * and stop before the ending, closing on "Go to AI Wizard Duel to see how it
 * ended!"
 *
 * Flow:
 *  1. Once a day (cron, when TEASERS_ENABLED is "true") pickDailyDuel picks the
 *     most popular recent duel. Admins can also make one for any duel.
 *  2. teaserMedia.draftTeaser writes a spoiler-free script, voices it, and
 *     optionally animates the round pictures with AI (aiMotion).
 *  3. A GitHub Action renders the video with Remotion (video/), pulling its
 *     inputs from the /teasers HTTP routes and uploading the MP4 back.
 *  4. Admins are notified, review it on /admin/teasers, and approve or reject.
 *     Approving posts it to YouTube when connected, and shows it on the duel page.
 */

import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { verifySuperAdmin } from "./auth.utils";
import { createNotification } from "./notifications";
import {
  chooseSceneRounds,
  spoilerSafeRounds,
  teaserScore,
} from "./lib/teaserPick";

/** Duels that finished this recently can be the daily pick. */
const DAILY_WINDOW_MS = 36 * 60 * 60 * 1000;
/** A render that hasn't reported back by now has failed. */
export const RENDER_TIMEOUT_MS = 30 * 60 * 1000;
/** A teaser needs at least this many pictures to be worth making. */
const MIN_SCENES = 2;

const isTestEnv = () => process.env.NODE_ENV === "test";

export function youtubeConnected(): boolean {
  return !!(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  );
}

async function loadRounds(ctx: QueryCtx, duelId: Id<"duels">) {
  const rounds = await ctx.db
    .query("duelRounds")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect();
  return rounds.map((r) => ({
    doc: r,
    roundNumber: r.roundNumber,
    type: r.type,
    status: r.status,
    narrative: r.outcome?.narrative,
    illustration: r.outcome?.illustration,
  }));
}

/** Rounds the teaser will show, or a reason the duel can't have a teaser. */
async function teaserScenes(
  ctx: QueryCtx,
  duel: Doc<"duels">,
): Promise<{ rounds: Doc<"duelRounds">[] } | { reason: string }> {
  if (duel.status !== "COMPLETED")
    return { reason: "The duel hasn't finished" };
  if (duel.textOnlyMode) return { reason: "The duel has no pictures" };
  const chosen = chooseSceneRounds(
    spoilerSafeRounds(await loadRounds(ctx, duel._id)),
  );
  if (chosen.length < MIN_SCENES) {
    return {
      reason:
        "Not enough illustrated rounds before the ending to make a teaser without spoiling it",
    };
  }
  return { rounds: chosen.map((r) => r.doc) };
}

async function activeTeaserFor(ctx: QueryCtx, duelId: Id<"duels">) {
  const teasers = await ctx.db
    .query("duelTeasers")
    .withIndex("by_duel", (q) => q.eq("duelId", duelId))
    .collect();
  return teasers.find((t) => t.status !== "REJECTED" && t.status !== "FAILED");
}

async function startTeaser(
  ctx: MutationCtx,
  args: {
    duelId: Id<"duels">;
    source: "daily" | "admin";
    aiMotion: boolean;
    pickScore?: number;
    pickReason?: string;
  },
): Promise<Id<"duelTeasers">> {
  const now = Date.now();
  const teaserId = await ctx.db.insert("duelTeasers", {
    ...args,
    status: "DRAFTING",
    createdAt: now,
    updatedAt: now,
  });
  if (!isTestEnv()) {
    await ctx.scheduler.runAfter(0, internal.teaserMedia.draftTeaser, {
      teaserId,
    });
  }
  return teaserId;
}

function defaultAiMotion(): boolean {
  return process.env.TEASER_AI_MOTION === "true";
}

/** Daily cron: make a teaser of the most popular duel that finished recently. */
export const pickDailyDuel = internalMutation({
  args: { force: v.optional(v.boolean()) },
  returns: v.union(v.null(), v.id("duelTeasers")),
  handler: async (ctx, { force }) => {
    if (!force && process.env.TEASERS_ENABLED !== "true") return null;

    const now = Date.now();
    // One daily teaser a day, even if the cron runs twice.
    const recent = await ctx.db
      .query("duelTeasers")
      .withIndex("by_created_at", (q) =>
        q.gt("createdAt", now - 20 * 60 * 60 * 1000),
      )
      .collect();
    if (!force && recent.some((t) => t.source === "daily")) return null;

    let best: { duel: Doc<"duels">; score: number; reason: string } | null =
      null;
    for await (const duel of ctx.db
      .query("duels")
      .withIndex("by_completed_at", (q) =>
        q.gt("completedAt", now - DAILY_WINDOW_MS),
      )) {
      if (duel.status !== "COMPLETED" || duel.isCampaignBattle) continue;
      if (await activeTeaserFor(ctx, duel._id)) continue;
      const scenes = await teaserScenes(ctx, duel);
      if ("reason" in scenes) continue;

      const stats = await ctx.db
        .query("duelViewStats")
        .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
        .unique();
      const rating = await ctx.db
        .query("duelRatings")
        .withIndex("by_duel", (q) => q.eq("duelId", duel._id))
        .unique();
      const candidate = {
        uniqueViewers: stats?.uniqueViewers ?? 0,
        signedInViewers: stats?.signedInViewers ?? 0,
        peakOnlookers: stats?.peakOnlookers ?? 0,
        aiRating: rating?.overall,
      };
      const score = teaserScore(candidate);
      if (!best || score > best.score) {
        best = {
          duel,
          score,
          reason: `${candidate.uniqueViewers} viewers, peak ${candidate.peakOnlookers} watching at once, AI rating ${rating?.overall ?? "none"}`,
        };
      }
    }

    if (!best) {
      console.log("No duel qualifies for a teaser today");
      return null;
    }
    return await startTeaser(ctx, {
      duelId: best.duel._id,
      source: "daily",
      aiMotion: defaultAiMotion(),
      pickScore: best.score,
      pickReason: best.reason,
    });
  },
});

/** Admin: make a teaser for a specific duel. */
export const createTeaserForDuel = mutation({
  args: { duelId: v.id("duels"), aiMotion: v.optional(v.boolean()) },
  returns: v.id("duelTeasers"),
  handler: async (ctx, { duelId, aiMotion }) => {
    await verifySuperAdmin(ctx);
    const duel = await ctx.db.get(duelId);
    if (!duel) throw new Error("Duel not found");
    if (duel.isCampaignBattle) {
      throw new Error("Campaign battles can't have teasers");
    }
    if (await activeTeaserFor(ctx, duelId)) {
      throw new Error("This duel already has a teaser");
    }
    const scenes = await teaserScenes(ctx, duel);
    if ("reason" in scenes) throw new Error(scenes.reason);
    return await startTeaser(ctx, {
      duelId,
      source: "admin",
      aiMotion: aiMotion ?? defaultAiMotion(),
      pickReason: "Chosen by an admin",
    });
  },
});

/** Storage files a teaser owns, except the rendered video. */
function draftStorageIds(teaser: Doc<"duelTeasers">): string[] {
  return [
    ...(teaser.segments ?? []).flatMap((s) =>
      [s.audioStorageId, s.clipStorageId].filter((id): id is string => !!id),
    ),
    ...(teaser.musicStorageId ? [teaser.musicStorageId] : []),
  ];
}

async function deleteStorage(ctx: MutationCtx, ids: string[]) {
  for (const id of ids) {
    try {
      await ctx.storage.delete(id as Id<"_storage">);
    } catch {
      // Already gone.
    }
  }
}

/** Admin: write, voice and render the teaser again, e.g. with AI motion on. */
export const regenerateTeaser = mutation({
  args: { teaserId: v.id("duelTeasers"), aiMotion: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { teaserId, aiMotion }) => {
    await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (!teaser) throw new Error("Teaser not found");
    if (!["READY", "FAILED", "REJECTED"].includes(teaser.status)) {
      throw new Error("This teaser is busy or already published");
    }
    const duel = await ctx.db.get(teaser.duelId);
    if (!duel) throw new Error("Duel not found");
    const other = await activeTeaserFor(ctx, teaser.duelId);
    if (other && other._id !== teaserId) {
      throw new Error("This duel already has another teaser");
    }
    await deleteStorage(ctx, [
      ...draftStorageIds(teaser),
      ...(teaser.videoStorageId ? [teaser.videoStorageId] : []),
    ]);
    await ctx.db.patch(teaserId, {
      status: "DRAFTING",
      aiMotion,
      segments: undefined,
      musicStorageId: undefined,
      title: undefined,
      description: undefined,
      videoStorageId: undefined,
      renderStartedAt: undefined,
      error: undefined,
      reviewedBy: undefined,
      reviewedAt: undefined,
      updatedAt: Date.now(),
    });
    if (!isTestEnv()) {
      await ctx.scheduler.runAfter(0, internal.teaserMedia.draftTeaser, {
        teaserId,
      });
    }
    return null;
  },
});

/** Admin: render again with the same script and voice. */
export const rerenderTeaser = mutation({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (!teaser?.segments) throw new Error("Nothing to render yet");
    if (!["READY", "FAILED", "RENDERING"].includes(teaser.status)) {
      throw new Error("This teaser can't be rendered again now");
    }
    await ctx.db.patch(teaserId, {
      status: "RENDERING",
      error: undefined,
      updatedAt: Date.now(),
    });
    if (!isTestEnv()) {
      await ctx.scheduler.runAfter(0, internal.teaserMedia.dispatchRender, {
        teaserId,
      });
    }
    return null;
  },
});

/**
 * Admin: approve a rendered teaser. With postToYouTube it uploads to the
 * connected channel first; otherwise it goes live on the duel page now and a
 * YouTube link can be added later with setTeaserYouTubeUrl.
 */
export const approveTeaser = mutation({
  args: {
    teaserId: v.id("duelTeasers"),
    postToYouTube: v.boolean(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { teaserId, postToYouTube, title, description }) => {
    const identity = await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (!teaser) throw new Error("Teaser not found");
    if (teaser.status !== "READY" || !teaser.videoStorageId) {
      throw new Error(
        "Only a rendered teaser waiting for review can be approved",
      );
    }
    if (postToYouTube && !youtubeConnected()) {
      throw new Error("YouTube isn't connected yet");
    }
    const now = Date.now();
    await ctx.db.patch(teaserId, {
      status: postToYouTube ? "PUBLISHING" : "PUBLISHED",
      title: title?.trim() ? title.trim().slice(0, 100) : teaser.title,
      description: description?.trim()
        ? description.trim()
        : teaser.description,
      reviewedBy: identity.subject,
      reviewedAt: now,
      publishedAt: postToYouTube ? undefined : now,
      error: undefined,
      updatedAt: now,
    });
    if (postToYouTube && !isTestEnv()) {
      await ctx.scheduler.runAfter(0, internal.teaserPublish.uploadToYouTube, {
        teaserId,
      });
    }
    return null;
  },
});

export const rejectTeaser = mutation({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    const identity = await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (!teaser) throw new Error("Teaser not found");
    if (teaser.status === "PUBLISHED" || teaser.status === "PUBLISHING") {
      throw new Error("Unpublish it instead");
    }
    await ctx.db.patch(teaserId, {
      status: "REJECTED",
      reviewedBy: identity.subject,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Admin: take a published teaser off the duel page. Doesn't touch YouTube. */
export const unpublishTeaser = mutation({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (teaser?.status !== "PUBLISHED") throw new Error("Not published");
    await ctx.db.patch(teaserId, {
      status: "READY",
      publishedAt: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** YouTube video ID from a watch, share or Shorts link (or a bare ID). */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com") {
      const fromQuery = url.searchParams.get("v");
      if (fromQuery) return fromQuery;
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      return match?.[1] ?? null;
    }
  } catch {
    // Not a URL.
  }
  return null;
}

/** Admin: link a teaser to a video uploaded to YouTube by hand. */
export const setTeaserYouTubeUrl = mutation({
  args: { teaserId: v.id("duelTeasers"), url: v.string() },
  returns: v.null(),
  handler: async (ctx, { teaserId, url }) => {
    await verifySuperAdmin(ctx);
    const teaser = await ctx.db.get(teaserId);
    if (!teaser) throw new Error("Teaser not found");
    if (teaser.status !== "PUBLISHED" && teaser.status !== "READY") {
      throw new Error("Approve the teaser first");
    }
    const videoId = parseYouTubeId(url);
    if (!videoId) throw new Error("That doesn't look like a YouTube link");
    await ctx.db.patch(teaserId, {
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/shorts/${videoId}`,
      updatedAt: Date.now(),
    });
    return null;
  },
});

async function wizardNames(ctx: QueryCtx, duel: Doc<"duels">) {
  const wizards = await Promise.all(duel.wizards.map((id) => ctx.db.get(id)));
  return wizards.map((w) => w?.name ?? "Unknown wizard");
}

/** Admin: recent teasers with everything needed to review them. */
export const listTeasers = query({
  args: {},
  handler: async (ctx) => {
    await verifySuperAdmin(ctx);
    const teasers = await ctx.db
      .query("duelTeasers")
      .withIndex("by_created_at")
      .order("desc")
      .take(30);
    const rows = await Promise.all(
      teasers.map(async (t) => {
        const duel = await ctx.db.get(t.duelId);
        return {
          _id: t._id,
          duelId: t.duelId,
          status: t.status,
          source: t.source,
          aiMotion: t.aiMotion,
          pickScore: t.pickScore,
          pickReason: t.pickReason,
          title: t.title,
          description: t.description,
          lines: (t.segments ?? []).map((s) => ({
            kind: s.kind,
            line: s.line,
            roundNumber: s.roundNumber,
            animated: !!s.clipStorageId,
          })),
          videoUrl: t.videoStorageId
            ? await ctx.storage.getUrl(t.videoStorageId as Id<"_storage">)
            : null,
          youtubeUrl: t.youtubeUrl,
          error: t.error,
          createdAt: t.createdAt,
          publishedAt: t.publishedAt,
          duelTitle: duel
            ? (await wizardNames(ctx, duel)).join(" vs ")
            : "Deleted duel",
        };
      }),
    );
    return { teasers: rows, youtubeConnected: youtubeConnected() };
  },
});

/** Public: the published teaser for a duel, if any. */
export const getDuelTeaser = query({
  args: { duelId: v.id("duels") },
  returns: v.union(
    v.null(),
    v.object({
      title: v.optional(v.string()),
      videoUrl: v.union(v.string(), v.null()),
      youtubeUrl: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { duelId }) => {
    const teasers = await ctx.db
      .query("duelTeasers")
      .withIndex("by_duel", (q) => q.eq("duelId", duelId))
      .collect();
    const live = teasers.find((t) => t.status === "PUBLISHED");
    if (!live?.videoStorageId) return null;
    return {
      title: live.title,
      videoUrl: await ctx.storage.getUrl(live.videoStorageId as Id<"_storage">),
      youtubeUrl: live.youtubeUrl,
    };
  },
});

// ----- Internal: used by teaserMedia, teaserPublish and the render routes -----

/** What the script writer gets. Deliberately leaves out who won. */
export const getDraftSource = internalQuery({
  args: { teaserId: v.id("duelTeasers") },
  handler: async (ctx, { teaserId }) => {
    const teaser = await ctx.db.get(teaserId);
    if (!teaser || teaser.status !== "DRAFTING") return null;
    const duel = await ctx.db.get(teaser.duelId);
    if (!duel) return null;
    const scenes = await teaserScenes(ctx, duel);
    if ("reason" in scenes) return { error: scenes.reason };

    const wizards = (
      await Promise.all(duel.wizards.map((id) => ctx.db.get(id)))
    ).filter((w): w is Doc<"wizards"> => w !== null);
    const nameOf = (id: string) =>
      wizards.find((w) => w._id === id)?.name ?? "A wizard";
    return {
      aiMotion: teaser.aiMotion,
      wizards: wizards.map((w) => ({
        name: w.name,
        description: w.description,
      })),
      rounds: scenes.rounds.map((r) => ({
        roundNumber: r.roundNumber,
        narrative: r.outcome?.narrative ?? "",
        spells: Object.entries(r.spells ?? {}).map(([wizardId, spell]) => ({
          wizard: nameOf(wizardId),
          spell: spell.description,
        })),
        imageStorageId: r.outcome?.illustration as string,
      })),
    };
  },
});

const segmentValidator = v.object({
  kind: v.union(v.literal("hook"), v.literal("scene"), v.literal("outro")),
  line: v.string(),
  roundNumber: v.optional(v.number()),
  imageStorageId: v.optional(v.string()),
  clipStorageId: v.optional(v.string()),
  audioStorageId: v.optional(v.string()),
  audioMs: v.optional(v.number()),
});

/** Saves the voiced script and moves on to rendering. False if superseded. */
export const saveDraft = internalMutation({
  args: {
    teaserId: v.id("duelTeasers"),
    title: v.string(),
    description: v.string(),
    segments: v.array(segmentValidator),
    musicStorageId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, { teaserId, ...draft }) => {
    const teaser = await ctx.db.get(teaserId);
    if (teaser?.status !== "DRAFTING") {
      await deleteStorage(
        ctx,
        [
          ...draft.segments.flatMap((s) => [s.audioStorageId, s.clipStorageId]),
          draft.musicStorageId,
        ].filter((id): id is string => !!id),
      );
      return false;
    }
    await ctx.db.patch(teaserId, {
      ...draft,
      status: "RENDERING",
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const failTeaser = internalMutation({
  args: { teaserId: v.id("duelTeasers"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { teaserId, error }) => {
    const teaser = await ctx.db.get(teaserId);
    if (!teaser) return null;
    await ctx.db.patch(teaserId, {
      status: "FAILED",
      error: error.slice(0, 1000),
      updatedAt: Date.now(),
    });
    return null;
  },
});

/** Notes that a render was requested, and fails it if it never reports back. */
export const markRenderStarted = internalMutation({
  args: { teaserId: v.id("duelTeasers"), note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { teaserId, note }) => {
    const teaser = await ctx.db.get(teaserId);
    if (teaser?.status !== "RENDERING") return null;
    const startedAt = Date.now();
    await ctx.db.patch(teaserId, {
      renderStartedAt: startedAt,
      error: note,
      updatedAt: startedAt,
    });
    if (!note) {
      await ctx.scheduler.runAfter(
        RENDER_TIMEOUT_MS,
        internal.teasers.checkRenderTimeout,
        { teaserId, startedAt },
      );
    }
    return null;
  },
});

export const checkRenderTimeout = internalMutation({
  args: { teaserId: v.id("duelTeasers"), startedAt: v.number() },
  returns: v.null(),
  handler: async (ctx, { teaserId, startedAt }) => {
    const teaser = await ctx.db.get(teaserId);
    if (
      teaser?.status === "RENDERING" &&
      teaser.renderStartedAt === startedAt
    ) {
      await ctx.db.patch(teaserId, {
        status: "FAILED",
        error:
          "The render job never reported back. Check the Render teaser workflow on GitHub Actions.",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

const SITE_LABEL = "aiwizardduel.com";

/** Inputs for the Remotion composition (see video/src/types.ts). */
export const getRenderProps = internalQuery({
  args: { teaserId: v.string() },
  handler: async (ctx, { teaserId }) => {
    const id = ctx.db.normalizeId("duelTeasers", teaserId);
    const teaser = id ? await ctx.db.get(id) : null;
    if (!teaser?.segments) return null;
    const duel = await ctx.db.get(teaser.duelId);
    if (!duel) return null;
    const url = async (storageId?: string) =>
      storageId ? await ctx.storage.getUrl(storageId as Id<"_storage">) : null;

    const wizards = await Promise.all(
      duel.wizards.map(async (wizardId) => {
        const wizard = await ctx.db.get(wizardId);
        return {
          name: wizard?.name ?? "Unknown wizard",
          portraitUrl: await url(wizard?.illustration),
        };
      }),
    );
    const segments = await Promise.all(
      teaser.segments.map(async (s) => ({
        kind: s.kind,
        line: s.line,
        imageUrl: await url(s.imageStorageId),
        clipUrl: await url(s.clipStorageId),
        audioUrl: await url(s.audioStorageId),
        audioMs: s.audioMs ?? 3000,
      })),
    );
    return {
      teaserId,
      wizards,
      segments,
      musicUrl: await url(teaser.musicStorageId),
      siteLabel: SITE_LABEL,
    };
  },
});

/** Called by the render job with the uploaded MP4, or an error. */
export const completeRender = internalMutation({
  args: {
    teaserId: v.string(),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, { teaserId, storageId, error }) => {
    const id = ctx.db.normalizeId("duelTeasers", teaserId);
    const teaser = id ? await ctx.db.get(id) : null;
    if (!id || !teaser || teaser.status !== "RENDERING") {
      if (storageId) await ctx.storage.delete(storageId);
      return false;
    }
    if (!storageId) {
      await ctx.db.patch(id, {
        status: "FAILED",
        error: `Render failed: ${(error ?? "unknown error").slice(0, 900)}`,
        updatedAt: Date.now(),
      });
      return true;
    }
    if (teaser.videoStorageId)
      await deleteStorage(ctx, [teaser.videoStorageId]);
    await ctx.db.patch(id, {
      status: "READY",
      videoStorageId: storageId,
      error: undefined,
      updatedAt: Date.now(),
    });

    const duel = await ctx.db.get(teaser.duelId);
    const title = duel ? (await wizardNames(ctx, duel)).join(" vs ") : "A duel";
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .take(20);
    for (const admin of admins) {
      await createNotification(ctx, {
        userId: admin.clerkId,
        type: "TEASER_READY",
        title: "Teaser ready for review",
        body: `${title} is ready. Approve it to post it.`,
        url: "/admin/teasers",
        dedupeKey: `teaser:${id}:${storageId}:${admin.clerkId}`,
      });
    }
    return true;
  },
});

/** Used by the YouTube upload. */
export const getPublishSource = internalQuery({
  args: { teaserId: v.id("duelTeasers") },
  handler: async (ctx, { teaserId }) => {
    const teaser = await ctx.db.get(teaserId);
    if (teaser?.status !== "PUBLISHING" || !teaser.videoStorageId) return null;
    const duel = await ctx.db.get(teaser.duelId);
    return {
      duelId: teaser.duelId,
      videoStorageId: teaser.videoStorageId as Id<"_storage">,
      title:
        teaser.title ??
        (duel ? (await wizardNames(ctx, duel)).join(" vs ") : "AI Wizard Duel"),
      description: teaser.description ?? "",
    };
  },
});

export const finishPublish = internalMutation({
  args: {
    teaserId: v.id("duelTeasers"),
    youtubeVideoId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { teaserId, youtubeVideoId, error }) => {
    const teaser = await ctx.db.get(teaserId);
    if (teaser?.status !== "PUBLISHING") return null;
    const now = Date.now();
    if (!youtubeVideoId) {
      // Back to review so an admin can retry or publish by hand.
      await ctx.db.patch(teaserId, {
        status: "READY",
        error: `YouTube upload failed: ${(error ?? "unknown error").slice(0, 900)}`,
        updatedAt: now,
      });
      return null;
    }
    await ctx.db.patch(teaserId, {
      status: "PUBLISHED",
      youtubeVideoId,
      youtubeUrl: `https://www.youtube.com/shorts/${youtubeVideoId}`,
      publishedAt: now,
      updatedAt: now,
    });
    return null;
  },
});
