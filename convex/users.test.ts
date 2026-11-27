import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { STARTING_TOKENS } from "./lib/pricing";

test("user creation and retrieval", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Test creating a new user
  const userId = await t
    .withIdentity({ subject: "new_user_123" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "new_user_123",
      email: "newuser@example.com",
      name: "New User",
    });

  expect(userId).toBeDefined();

  // Test retrieving the user
  const user = await t.query(internal.users.getUserByClerkId, {
    clerkId: "new_user_123",
  });

  expect(user).toBeDefined();
  expect(user?.clerkId).toBe("new_user_123");
  expect(user?.email).toBe("newuser@example.com");
  expect(user?.name).toBe("New User");
  expect(user?.role).toBe("user");
  expect(user).not.toHaveProperty("subscriptionTier");
  expect(user).not.toHaveProperty("monthlyUsage");
  expect(user?.imageCredits).toBe(STARTING_TOKENS);

  // Test that calling getOrCreateUser again returns the same user
  const sameUserId = await t
    .withIdentity({ subject: "new_user_123" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "new_user_123",
      email: "newuser@example.com",
      name: "New User",
    });

  expect(sameUserId).toBe(userId);
});

test("user creation with minimal info", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Test creating a user with just clerkId
  const userId = await t
    .withIdentity({ subject: "minimal_user_456" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "minimal_user_456",
    });

  expect(userId).toBeDefined();

  // Test retrieving the user
  const user = await t.query(internal.users.getUserByClerkId, {
    clerkId: "minimal_user_456",
  });

  expect(user).toBeDefined();
  expect(user?.clerkId).toBe("minimal_user_456");
  expect(user?.email).toBeUndefined();
  expect(user?.name).toBeUndefined();
  expect(user?.imageCredits).toBe(STARTING_TOKENS);
});

test("getUserImageCredits works after user creation", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create a user
  await t
    .withIdentity({ subject: "credit_test_user" })
    .mutation(api.users.getOrCreateUser, {
      clerkId: "credit_test_user",
      email: "credituser@example.com",
      name: "Credit User",
    });

  // Test that getUserImageCredits works
  const credits = await t
    .withIdentity({ subject: "credit_test_user" })
    .query(api.imageCreditService.getUserImageCredits, {});

  expect(credits).toBe(STARTING_TOKENS);
});
