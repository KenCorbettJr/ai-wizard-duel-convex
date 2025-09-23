import type { TestConvex } from "convex-test";
import { Id, TableNames } from "./_generated/dataModel";
import { api } from "./_generated/api";
import schema from "./schema";

// Generate a proper Convex ID for testing
// Convex IDs follow the pattern: k{table_number}{random_string}
export function generateTestId<T extends TableNames>(table: T): Id<T> {
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
export function generateTestIds<T extends TableNames>(
  table: T,
  count: number
): Id<T>[] {
  return Array.from({ length: count }, () => generateTestId(table));
}

// Mock user identity for testing
export function createMockUserIdentity(
  userId: string = "test-user-1",
  role: string = "user"
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

// Set up authenticated context for tests
export function withAuth(
  t: TestConvex<typeof schema>,
  userId: string = "test-user-1"
) {
  const identity = createMockUserIdentity(userId);
  return t.withIdentity(identity);
}

// Set up super admin authenticated context for tests
export function withSuperAdminAuth(
  t: TestConvex<typeof schema>,
  userId: string = "super-admin-user"
) {
  const identity = createMockUserIdentity(userId, "super_admin");
  return t.withIdentity(identity);
}

// Create a database user for testing
export async function createTestUser(
  t: TestConvex<typeof schema>,
  clerkId: string,
  role: "user" | "admin" | "super_admin" = "user"
) {
  return await t
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
