import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

test("user creation and retrieval", async () => {
  const t = convexTest(schema);

  // Test creating a new user
  const userId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "new_user_123",
    email: "newuser@example.com",
    name: "New User",
  });

  expect(userId).toBeDefined();

  // Test retrieving the user
  const user = await t.query(api.users.getUserByClerkId, {
    clerkId: "new_user_123",
  });

  expect(user).toBeDefined();
  expect(user?.clerkId).toBe("new_user_123");
  expect(user?.email).toBe("newuser@example.com");
  expect(user?.name).toBe("New User");
  expect(user?.role).toBe("user");
  expect(user?.subscriptionTier).toBe("FREE");
  expect(user?.subscriptionStatus).toBe("ACTIVE");
  expect(user?.imageCredits).toBe(10); // Initial credits

  // Test that calling getOrCreateUser again returns the same user
  const sameUserId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "new_user_123",
    email: "newuser@example.com",
    name: "New User",
  });

  expect(sameUserId).toBe(userId);
});

test("user creation with minimal info", async () => {
  const t = convexTest(schema);

  // Test creating a user with just clerkId
  const userId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "minimal_user_456",
  });

  expect(userId).toBeDefined();

  // Test retrieving the user
  const user = await t.query(api.users.getUserByClerkId, {
    clerkId: "minimal_user_456",
  });

  expect(user).toBeDefined();
  expect(user?.clerkId).toBe("minimal_user_456");
  expect(user?.email).toBeUndefined();
  expect(user?.name).toBeUndefined();
  expect(user?.imageCredits).toBe(10); // Should still get initial credits
});

test("getUserImageCredits works after user creation", async () => {
  const t = convexTest(schema);

  // Create a user
  await t.mutation(api.users.getOrCreateUser, {
    clerkId: "credit_test_user",
    email: "credituser@example.com",
    name: "Credit User",
  });

  // Test that getUserImageCredits works
  const credits = await t.query(api.imageCreditService.getUserImageCredits, {
    userId: "credit_test_user",
  });

  expect(credits).toBe(10); // Should have initial 10 credits
});
