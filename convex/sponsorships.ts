import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { verifySuperAdmin } from "./auth.utils";
import { seatsPromised } from "./lib/duelTokens";
import {
  budgetLeft,
  findRunningSponsorship,
  isInWindow,
  playerEntriesLeft,
} from "./lib/sponsorship";

const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 140;
const MAX_LOGO_BYTES = 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

async function logoUrl(
  ctx: QueryCtx,
  storageId: Id<"_storage"> | undefined,
): Promise<string | null> {
  return storageId ? await ctx.storage.getUrl(storageId) : null;
}

/** An upload URL for a sponsor's logo (super admin). */
export const generateLogoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await verifySuperAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Throw unless the uploaded file is a small image; delete it if not. */
async function checkLogo(ctx: MutationCtx, storageId: Id<"_storage">) {
  const file = await ctx.db.system.get(storageId);
  if (!file) throw new ConvexError("The logo upload didn't finish. Try again.");
  if (!file.contentType || !LOGO_TYPES.includes(file.contentType)) {
    await ctx.storage.delete(storageId);
    throw new ConvexError("The logo must be a PNG, JPEG, WebP or SVG image.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    await ctx.storage.delete(storageId);
    throw new ConvexError("The logo must be under 1 MB.");
  }
}

/**
 * The sponsorship running right now, for the site banner and the token UI.
 * `coversYou` says whether the signed-in player's next entry is free (null
 * when signed out). `entriesLeftToday` is null when there is no daily limit.
 */
export const getCurrent = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      sponsorName: v.string(),
      message: v.union(v.string(), v.null()),
      url: v.union(v.string(), v.null()),
      logoUrl: v.union(v.string(), v.null()),
      endsAt: v.number(),
      dailyEntriesPerPlayer: v.union(v.number(), v.null()),
      coversYou: v.union(v.boolean(), v.null()),
      entriesLeftToday: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const now = Date.now();
    const s = await findRunningSponsorship(ctx, now);
    if (!s) return null;

    const identity = await ctx.auth.getUserIdentity();
    // Entries the player's waiting duels will use when they start are
    // already spoken for, so they don't count as free for a new duel
    const left = identity
      ? Math.max(
          0,
          (await playerEntriesLeft(ctx, s, identity.subject, now)) -
            (await seatsPromised(ctx, identity.subject)),
        )
      : null;
    return {
      sponsorName: s.sponsorName,
      message: s.message ?? null,
      url: s.url ?? null,
      logoUrl: await logoUrl(ctx, s.logoStorageId),
      endsAt: s.endsAt,
      dailyEntriesPerPlayer: s.dailyEntriesPerPlayer ?? null,
      coversYou: left === null ? null : left > 0,
      entriesLeftToday:
        left === null || s.dailyEntriesPerPlayer === undefined ? null : left,
    };
  },
});

const sponsorshipFields = {
  sponsorName: v.string(),
  message: v.optional(v.string()),
  url: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  startsAt: v.number(),
  endsAt: v.number(),
  maxEntries: v.optional(v.number()),
  dailyEntriesPerPlayer: v.optional(v.number()),
};

type SponsorshipFields = {
  sponsorName: string;
  message?: string;
  url?: string;
  logoStorageId?: Id<"_storage">;
  startsAt: number;
  endsAt: number;
  maxEntries?: number;
  dailyEntriesPerPlayer?: number;
};

/** Trim and check the admin's input. Throws a ConvexError the form can show. */
async function cleanFields(
  ctx: MutationCtx,
  fields: SponsorshipFields,
  editingId?: Id<"sponsorships">,
) {
  const sponsorName = fields.sponsorName.trim();
  if (!sponsorName) throw new ConvexError("Give the sponsor a name.");
  if (sponsorName.length > MAX_NAME_LENGTH) {
    throw new ConvexError(
      `Keep the sponsor's name under ${MAX_NAME_LENGTH} characters.`,
    );
  }

  const message = fields.message?.trim() || undefined;
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    throw new ConvexError(
      `Keep the banner message under ${MAX_MESSAGE_LENGTH} characters.`,
    );
  }

  let url = fields.url?.trim() || undefined;
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ConvexError("The sponsor link isn't a valid web address.");
    }
    if (parsed.protocol !== "https:") {
      throw new ConvexError("The sponsor link must start with https://");
    }
    url = parsed.toString();
  }

  if (!Number.isFinite(fields.startsAt) || !Number.isFinite(fields.endsAt)) {
    throw new ConvexError("Pick a start and an end time.");
  }
  if (fields.endsAt <= fields.startsAt) {
    throw new ConvexError("The sponsorship has to end after it starts.");
  }

  for (const [label, value] of [
    ["The entry budget", fields.maxEntries],
    ["The daily limit per player", fields.dailyEntriesPerPlayer],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      throw new ConvexError(`${label} must be a whole number of at least 1.`);
    }
  }

  // At most one sponsorship runs at a time, so windows can't overlap.
  const overlapping = await ctx.db
    .query("sponsorships")
    .withIndex("by_ends_at", (q) => q.gt("endsAt", fields.startsAt))
    .collect();
  const clash = overlapping.find(
    (other) =>
      other._id !== editingId &&
      !other.endedEarlyAt &&
      other.startsAt < fields.endsAt,
  );
  if (clash) {
    throw new ConvexError(
      `This overlaps ${clash.sponsorName}'s sponsorship. Only one sponsor can run at a time.`,
    );
  }

  return {
    sponsorName,
    message,
    url,
    logoStorageId: fields.logoStorageId,
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    maxEntries: fields.maxEntries,
    dailyEntriesPerPlayer: fields.dailyEntriesPerPlayer,
  };
}

const statusValidator = v.union(
  v.literal("UPCOMING"),
  v.literal("RUNNING"),
  v.literal("BUDGET_SPENT"),
  v.literal("ENDED"),
);

/** Every sponsorship, newest first, with how much it was used (super admin). */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sponsorships"),
      sponsorName: v.string(),
      message: v.union(v.string(), v.null()),
      url: v.union(v.string(), v.null()),
      logoStorageId: v.union(v.id("_storage"), v.null()),
      logoUrl: v.union(v.string(), v.null()),
      startsAt: v.number(),
      endsAt: v.number(),
      maxEntries: v.union(v.number(), v.null()),
      dailyEntriesPerPlayer: v.union(v.number(), v.null()),
      entriesUsed: v.number(),
      players: v.number(),
      endedEarlyAt: v.union(v.number(), v.null()),
      status: statusValidator,
    }),
  ),
  handler: async (ctx) => {
    await verifySuperAdmin(ctx);
    const now = Date.now();
    const all = await ctx.db.query("sponsorships").collect();
    all.sort((a, b) => b.startsAt - a.startsAt);

    return await Promise.all(
      all.map(async (s) => {
        const usage = await ctx.db
          .query("sponsorshipUsage")
          .withIndex("by_sponsorship", (q) => q.eq("sponsorshipId", s._id))
          .collect();
        const players = new Set(usage.map((u) => u.userId)).size;
        const status = s.endedEarlyAt
          ? "ENDED"
          : now < s.startsAt
            ? "UPCOMING"
            : now >= s.endsAt
              ? "ENDED"
              : budgetLeft(s) === 0
                ? "BUDGET_SPENT"
                : "RUNNING";
        return {
          _id: s._id,
          sponsorName: s.sponsorName,
          message: s.message ?? null,
          url: s.url ?? null,
          logoStorageId: s.logoStorageId ?? null,
          logoUrl: await logoUrl(ctx, s.logoStorageId),
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          maxEntries: s.maxEntries ?? null,
          dailyEntriesPerPlayer: s.dailyEntriesPerPlayer ?? null,
          entriesUsed: s.entriesUsed,
          players,
          endedEarlyAt: s.endedEarlyAt ?? null,
          status: status as "UPCOMING" | "RUNNING" | "BUDGET_SPENT" | "ENDED",
        };
      }),
    );
  },
});

/** Schedule a sponsorship (super admin). */
export const create = mutation({
  args: sponsorshipFields,
  returns: v.id("sponsorships"),
  handler: async (ctx, args) => {
    const identity = await verifySuperAdmin(ctx);
    const fields = await cleanFields(ctx, args);
    if (fields.logoStorageId) await checkLogo(ctx, fields.logoStorageId);
    const now = Date.now();
    return await ctx.db.insert("sponsorships", {
      ...fields,
      entriesUsed: 0,
      createdBy: identity.subject,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Change a sponsorship that hasn't ended (super admin). */
export const update = mutation({
  args: { sponsorshipId: v.id("sponsorships"), ...sponsorshipFields },
  returns: v.null(),
  handler: async (ctx, { sponsorshipId, ...args }) => {
    await verifySuperAdmin(ctx);
    const existing = await ctx.db.get(sponsorshipId);
    if (!existing) throw new ConvexError("Sponsorship not found.");
    if (existing.endedEarlyAt || existing.endsAt <= Date.now()) {
      throw new ConvexError("This sponsorship has ended and can't be changed.");
    }
    const fields = await cleanFields(ctx, args, sponsorshipId);
    if (fields.logoStorageId !== existing.logoStorageId) {
      if (fields.logoStorageId) await checkLogo(ctx, fields.logoStorageId);
      if (existing.logoStorageId) {
        await ctx.storage.delete(existing.logoStorageId);
      }
    }
    // Patching with undefined clears an optional field the admin emptied.
    await ctx.db.patch(sponsorshipId, { ...fields, updatedAt: Date.now() });
    return null;
  },
});

/** Stop a running sponsorship now (super admin). */
export const endNow = mutation({
  args: { sponsorshipId: v.id("sponsorships") },
  returns: v.null(),
  handler: async (ctx, { sponsorshipId }) => {
    await verifySuperAdmin(ctx);
    const s = await ctx.db.get(sponsorshipId);
    if (!s) throw new ConvexError("Sponsorship not found.");
    const now = Date.now();
    if (!isInWindow(s, now)) {
      throw new ConvexError("Only a running sponsorship can be ended early.");
    }
    await ctx.db.patch(sponsorshipId, { endedEarlyAt: now, updatedAt: now });
    return null;
  },
});

/** Delete a sponsorship nobody has used yet (super admin). */
export const remove = mutation({
  args: { sponsorshipId: v.id("sponsorships") },
  returns: v.null(),
  handler: async (ctx, { sponsorshipId }) => {
    await verifySuperAdmin(ctx);
    const s = await ctx.db.get(sponsorshipId);
    if (!s) return null;
    if (s.entriesUsed > 0) {
      throw new ConvexError(
        "Players have already used this sponsorship, so it stays on record. End it instead.",
      );
    }
    if (s.logoStorageId) await ctx.storage.delete(s.logoStorageId);
    await ctx.db.delete(sponsorshipId);
    return null;
  },
});

/** Who sponsored a duel, for the credit on the duel page. */
export const getDuelSponsor = query({
  args: { sponsorshipId: v.id("sponsorships") },
  returns: v.union(
    v.null(),
    v.object({
      sponsorName: v.string(),
      url: v.union(v.string(), v.null()),
      logoUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { sponsorshipId }) => {
    const s = await ctx.db.get(sponsorshipId);
    if (!s) return null;
    return {
      sponsorName: s.sponsorName,
      url: s.url ?? null,
      logoUrl: await logoUrl(ctx, s.logoStorageId),
    };
  },
});
