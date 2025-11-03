import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { withAuth, createTestUser } from "./test_utils";

test("user ID availability checking", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Test valid user ID that's available
  const result1 = await t.query(api.userProfiles.checkUserIdAvailability, {
    userId: "testuser123",
  });
  expect(result1.available).toBe(true);
  expect(result1.valid).toBe(true);
  expect(result1.error).toBeUndefined();

  // Test invalid user ID (too short)
  const result2 = await t.query(api.userProfiles.checkUserIdAvailability, {
    userId: "ab",
  });
  expect(result2.available).toBe(false);
  expect(result2.valid).toBe(false);
  expect(result2.error).toContain("at least 3 characters");

  // Test invalid user ID (too long)
  const result3 = await t.query(api.userProfiles.checkUserIdAvailability, {
    userId: "a".repeat(21),
  });
  expect(result3.available).toBe(false);
  expect(result3.valid).toBe(false);
  expect(result3.error).toContain("no more than 20 characters");

  // Test invalid characters
  const result4 = await t.query(api.userProfiles.checkUserIdAvailability, {
    userId: "test@user",
  });
  expect(result4.available).toBe(false);
  expect(result4.valid).toBe(false);
  expect(result4.error).toContain("letters, numbers, underscores, and hyphens");

  // Test reserved word
  const result5 = await t.query(api.userProfiles.checkUserIdAvailability, {
    userId: "admin",
  });
  expect(result5.available).toBe(false);
  expect(result5.valid).toBe(false);
  expect(result5.error).toContain("reserved");
});

test("user ID assignment", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const clerkId = "test_clerk_id";

  // Create a test user first
  await createTestUser(t, clerkId);

  // Test successful user ID assignment
  const result1 = await withAuth(t, clerkId).mutation(
    api.userProfiles.setUserId,
    {
      userId: "testuser123",
      displayName: "Test Display Name",
    }
  );

  expect(result1.success).toBe(true);
  expect(result1.error).toBeUndefined();

  // Test that user ID cannot be changed once set
  const result2 = await withAuth(t, clerkId).mutation(
    api.userProfiles.setUserId,
    {
      userId: "newtestuser",
      displayName: "New Display Name",
    }
  );
  expect(result2.success).toBe(false);
  expect(result2.error).toContain("already been set");
});

test("get user profile", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const clerkId = "test_clerk_id_2";

  // Create a test user
  await createTestUser(t, clerkId);

  // Set user ID
  const setResult = await withAuth(t, clerkId).mutation(
    api.userProfiles.setUserId,
    {
      userId: "testuser456",
      displayName: "Test Display Name 2",
    }
  );

  expect(setResult.success).toBe(true);

  // Test getting user profile
  const profile = await t.query(api.userProfiles.getUserProfile, {
    userId: "testuser456",
  });

  expect(profile).not.toBeNull();
  expect(profile?.userId).toBe("testuser456");
  expect(profile?.displayName).toBe("Test Display Name 2");
  expect(profile?.totalWizards).toBe(0);
  expect(profile?.totalDuels).toBe(0);

  // Test getting non-existent user profile
  const nonExistentProfile = await t.query(api.userProfiles.getUserProfile, {
    userId: "nonexistent",
  });
  expect(nonExistentProfile).toBeNull();
});

test("get user wizards", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const clerkId = "test_clerk_id_3";

  // Create a test user
  await createTestUser(t, clerkId);

  // Set user ID
  await withAuth(t, clerkId).mutation(api.userProfiles.setUserId, {
    userId: "testuser789",
    displayName: "Test Display Name 3",
  });

  // Test getting user wizards (should be empty initially)
  const wizards = await t.query(api.userProfiles.getUserWizards, {
    userId: "testuser789",
  });
  expect(wizards).toEqual([]);

  // Test getting wizards for non-existent user
  const nonExistentWizards = await t.query(api.userProfiles.getUserWizards, {
    userId: "nonexistent",
  });
  expect(nonExistentWizards).toEqual([]);
});

test("update user profile", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));
  const clerkId = "test_clerk_id_4";

  // Create a test user
  await createTestUser(t, clerkId);

  // Set user ID first
  const setResult = await withAuth(t, clerkId).mutation(
    api.userProfiles.setUserId,
    {
      userId: "testuser999",
      displayName: "Original Display Name",
    }
  );
  expect(setResult.success).toBe(true);

  // Test successful profile update
  const updateResult = await withAuth(t, clerkId).mutation(
    api.userProfiles.updateUserProfile,
    {
      displayName: "Updated Display Name",
    }
  );
  expect(updateResult.success).toBe(true);
  expect(updateResult.error).toBeUndefined();

  // Verify the profile was updated
  const profile = await t.query(api.userProfiles.getUserProfile, {
    userId: "testuser999",
  });
  expect(profile?.displayName).toBe("Updated Display Name");

  // Test validation - empty display name
  const emptyResult = await withAuth(t, clerkId).mutation(
    api.userProfiles.updateUserProfile,
    {
      displayName: "",
    }
  );
  expect(emptyResult.success).toBe(false);
  expect(emptyResult.error).toContain("cannot be empty");

  // Test validation - display name too long
  const longResult = await withAuth(t, clerkId).mutation(
    api.userProfiles.updateUserProfile,
    {
      displayName: "a".repeat(51),
    }
  );
  expect(longResult.success).toBe(false);
  expect(longResult.error).toContain("50 characters or less");

  // Test updating profile without completing setup first
  const newClerkId = "test_clerk_id_5";
  await createTestUser(t, newClerkId);

  const noSetupResult = await withAuth(t, newClerkId).mutation(
    api.userProfiles.updateUserProfile,
    {
      displayName: "Should Fail",
    }
  );
  expect(noSetupResult.success).toBe(false);
  expect(noSetupResult.error).toContain("Profile setup must be completed");
});
