import type { TestConvex } from "convex-test";
import { Id, TableNames } from "./_generated/dataModel";
import { getFunctionName, type FunctionReference } from "convex/server";
import { api } from "./_generated/api";
import { insertWaitingDuel } from "./duels";
import schema from "./schema";

// Generate a proper Convex ID for testing
// Convex IDs follow the pattern: k{table_number}{random_string}
export function generateTestId<T extends TableNames>(): Id<T> {
  // Generate a random string that looks like a real Convex ID
  // Real Convex IDs are base32-encoded and around 26 characters
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"; // base32 alphabet
  let randomString = "";
  for (let i = 0; i < 25; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Use a consistent prefix that looks like real Convex IDs
  return `k${randomString}` as Id<T>;
}

// Generate multiple test IDs
export function generateTestIds<T extends TableNames>(count: number): Id<T>[] {
  return Array.from({ length: count }, () => generateTestId<T>());
}

// Mock user identity for testing
export function createMockUserIdentity(
  userId: string = "test-user-1",
  role: string = "user",
) {
  return {
    subject: userId,
    issuer: "https://test.clerk.accounts.dev",
    aud: "convex",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: `${userId}@test.com`,
    name: `Test User ${userId}`,
    publicMetadata: {
      role: role,
    },
  };
}

// Mutations that take a token from the caller
const TOKEN_SPENDING_FUNCTIONS = new Set([
  "duels:createDuel",
  "duels:joinDuel",
  "duels:requestRematch",
  "campaigns:startCampaignBattle",
  "wizards:regenerateIllustration",
]);

// Set up authenticated context for tests
export function withAuth(
  t: TestConvex<typeof schema>,
  userId: string = "test-user-1",
) {
  const identity = createMockUserIdentity(userId);
  const authed = t.withIdentity(identity);
  // Entering a duel costs a token, so mutations need a user record that has
  // some. Create one the first time this user calls a mutation, unless the
  // test already created it.
  const runMutation = authed.mutation.bind(authed);
  authed.mutation = (async (
    ref: FunctionReference<"mutation">,
    args: never,
  ) => {
    if (TOKEN_SPENDING_FUNCTIONS.has(getFunctionName(ref))) {
      await ensureTestUser(t, userId);
    }
    return runMutation(ref, args);
  }) as unknown as typeof authed.mutation;
  return authed;
}

/** Create a user with starter tokens if the test has not created one. */
export async function ensureTestUser(
  t: TestConvex<typeof schema>,
  userId: string,
  tokens: number = 10,
) {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userId))
      .first();
    if (existing) return;
    await ctx.db.insert("users", {
      clerkId: userId,
      role: "user",
      email: `${userId}@test.com`,
      name: `Test User ${userId}`,
      // A username: creating a duel needs a finished profile
      userId: userId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 20),
      imageCredits: tokens,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

// Set up super admin authenticated context for tests
export function withSuperAdminAuth(
  t: TestConvex<typeof schema>,
  userId: string = "super-admin-user",
) {
  const identity = createMockUserIdentity(userId, "super_admin");
  return t.withIdentity(identity);
}

// Create a database user for testing
export async function createTestUser(
  t: TestConvex<typeof schema>,
  clerkId: string,
  role: "user" | "admin" | "super_admin" = "user",
) {
  return await t
    .withIdentity({ subject: clerkId })
    .mutation(api.users.getOrCreateUser, {
      clerkId,
      email: `${clerkId}@test.com`,
      name: `Test User ${clerkId}`,
    })
    .then(async (userId: string) => {
      // Update role if not default
      if (role !== "user") {
        await t.run(async (ctx) => {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
            .first();
          if (user) {
            await ctx.db.patch(user._id, { role });
          }
        });
      }
      return userId;
    });
}

/**
 * A waiting duel owned by `ownerId`, skipping createDuel's player-facing rules
 * (one wizard, menu lengths, username). For tests that need unusual duels,
 * like several of one player's wizards or a 1-round duel.
 */
export async function createTestDuel(
  t: TestConvex<typeof schema>,
  ownerId: string,
  args: {
    numberOfRounds: number | "TO_THE_DEATH";
    wizards: Id<"wizards">[];
    coverOpponentEntry?: boolean;
    enableChat?: boolean;
  },
): Promise<Id<"duels">> {
  await ensureTestUser(t, ownerId);
  return await t.run((ctx) =>
    insertWaitingDuel(ctx, {
      userId: ownerId,
      numberOfRounds: args.numberOfRounds,
      wizards: args.wizards,
      coverOpponentEntry: args.coverOpponentEntry,
      chatEnabled: args.enableChat,
    }),
  );
}
