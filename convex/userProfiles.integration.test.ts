import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth, createTestUser } from "./test_utils";

describe("User Profile Integration Tests", () => {
  describe("Complete User Onboarding Flow", () => {
    test("should complete full user onboarding with profile setup", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-onboarding";

      // Step 1: Create initial user record (simulates Clerk signup)
      await createTestUser(t, clerkId);

      // Step 2: Check initial profile status - should not have profile
      const initialStatus = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(initialStatus.hasProfile).toBe(false);
      expect(initialStatus.userId).toBeUndefined();

      // Step 3: Check user ID availability for desired handle
      const availabilityCheck = await t.query(
        api.userProfiles.checkUserIdAvailability,
        { userId: "johndoe" }
      );
      expect(availabilityCheck.available).toBe(true);
      expect(availabilityCheck.valid).toBe(true);
      expect(availabilityCheck.error).toBeUndefined();

      // Step 4: Set user ID and complete profile setup
      const profileSetup = await withAuth(t, clerkId).mutation(
        api.userProfiles.setUserId,
        {
          userId: "johndoe",
          displayName: "John Doe",
        }
      );
      expect(profileSetup.success).toBe(true);
      expect(profileSetup.error).toBeUndefined();

      // Step 5: Verify profile is now complete
      const finalStatus = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(finalStatus.hasProfile).toBe(true);
      expect(finalStatus.userId).toBe("johndoe");
      expect(finalStatus.displayName).toBe("John Doe");

      // Step 6: Verify public profile is accessible
      const publicProfile = await t.query(api.userProfiles.getUserProfile, {
        userId: "johndoe",
      });
      expect(publicProfile).not.toBeNull();
      expect(publicProfile?.userId).toBe("johndoe");
      expect(publicProfile?.displayName).toBe("John Doe");
      expect(publicProfile?.totalWizards).toBe(0);
      expect(publicProfile?.totalDuels).toBe(0);
      expect(publicProfile?.wins).toBe(0);
      expect(publicProfile?.losses).toBe(0);
      expect(publicProfile?.winRate).toBe(0);
    });

    test("should prevent duplicate user ID during onboarding", async () => {
      const t = convexTest(schema);
      const clerkId1 = "test-user-1";
      const clerkId2 = "test-user-2";

      // Create two users
      await createTestUser(t, clerkId1);
      await createTestUser(t, clerkId2);

      // First user claims the handle
      const firstUserSetup = await withAuth(t, clerkId1).mutation(
        api.userProfiles.setUserId,
        {
          userId: "testhandle",
          displayName: "First User",
        }
      );
      expect(firstUserSetup.success).toBe(true);

      // Second user tries to claim the same handle
      const availabilityCheck = await t.query(
        api.userProfiles.checkUserIdAvailability,
        { userId: "testhandle" }
      );
      expect(availabilityCheck.available).toBe(false);
      expect(availabilityCheck.valid).toBe(true);
      expect(availabilityCheck.error).toBe("This user ID is already taken");
      expect(availabilityCheck.suggestions).toBeDefined();
      expect(availabilityCheck.suggestions?.length).toBeGreaterThan(0);

      // Second user setup should fail
      const secondUserSetup = await withAuth(t, clerkId2).mutation(
        api.userProfiles.setUserId,
        {
          userId: "testhandle",
          displayName: "Second User",
        }
      );
      expect(secondUserSetup.success).toBe(false);
      expect(secondUserSetup.error).toBe("This user ID is already taken");
    });

    test("should handle case-insensitive user ID uniqueness", async () => {
      const t = convexTest(schema);
      const clerkId1 = "test-user-case-1";
      const clerkId2 = "test-user-case-2";

      await createTestUser(t, clerkId1);
      await createTestUser(t, clerkId2);

      // First user claims handle in lowercase
      const firstUserSetup = await withAuth(t, clerkId1).mutation(
        api.userProfiles.setUserId,
        {
          userId: "testhandle",
          displayName: "First User",
        }
      );
      expect(firstUserSetup.success).toBe(true);

      // Second user tries different case variations
      const variations = ["TestHandle", "TESTHANDLE", "testHandle"];

      for (const variation of variations) {
        const availabilityCheck = await t.query(
          api.userProfiles.checkUserIdAvailability,
          { userId: variation }
        );
        expect(availabilityCheck.available).toBe(false);
        expect(availabilityCheck.error).toBe("This user ID is already taken");

        const setupAttempt = await withAuth(t, clerkId2).mutation(
          api.userProfiles.setUserId,
          {
            userId: variation,
            displayName: "Second User",
          }
        );
        expect(setupAttempt.success).toBe(false);
      }
    });
  });

  describe("Public Profile Page Rendering", () => {
    test("should render public profile with real wizard and duel data", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-profile-data";

      // Setup user with profile
      await createTestUser(t, clerkId);
      await withAuth(t, clerkId).mutation(api.userProfiles.setUserId, {
        userId: "gamemaster",
        displayName: "Game Master",
      });

      // Create wizards for the user
      const wizard1Id = await withAuth(t, clerkId).mutation(
        api.wizards.createWizard,
        {
          name: "Fire Mage",
          description: "A powerful fire wizard",
        }
      );

      const wizard2Id = await withAuth(t, clerkId).mutation(
        api.wizards.createWizard,
        {
          name: "Ice Sorceress",
          description: "Master of ice magic",
        }
      );

      // Update wizard stats to simulate battle history
      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard1Id,
        won: true,
      });
      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard1Id,
        won: true,
      });
      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard1Id,
        won: false,
      });

      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard2Id,
        won: true,
      });
      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard2Id,
        won: false,
      });
      await withAuth(t, clerkId).mutation(api.wizards.updateWizardStats, {
        wizardId: wizard2Id,
        won: false,
      });

      // Create a duel to add to duel count
      await withAuth(t, clerkId).mutation(api.duels.createDuel, {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      });

      // Get public profile
      const profile = await t.query(api.userProfiles.getUserProfile, {
        userId: "gamemaster",
      });

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe("gamemaster");
      expect(profile?.displayName).toBe("Game Master");
      expect(profile?.totalWizards).toBe(2);
      expect(profile?.totalDuels).toBe(1);
      expect(profile?.wins).toBe(3); // 2 + 1 wins across wizards
      expect(profile?.losses).toBe(3); // 1 + 2 losses across wizards
      expect(profile?.winRate).toBe(50); // 3 wins out of 6 total games

      // Get user's wizards
      const userWizards = await t.query(api.userProfiles.getUserWizards, {
        userId: "gamemaster",
      });

      expect(userWizards).toHaveLength(2);

      const fireMage = userWizards.find((w) => w.name === "Fire Mage");
      expect(fireMage).toBeDefined();
      expect(fireMage?.wins).toBe(2);
      expect(fireMage?.losses).toBe(1);
      expect(fireMage?.winRate).toBe(67); // 2 wins out of 3 games

      const iceSorceress = userWizards.find((w) => w.name === "Ice Sorceress");
      expect(iceSorceress).toBeDefined();
      expect(iceSorceress?.wins).toBe(1);
      expect(iceSorceress?.losses).toBe(2);
      expect(iceSorceress?.winRate).toBe(33); // 1 win out of 3 games
    });

    test("should handle non-existent user profile gracefully", async () => {
      const t = convexTest(schema);

      // Try to get profile for non-existent user
      const profile = await t.query(api.userProfiles.getUserProfile, {
        userId: "nonexistentuser",
      });

      expect(profile).toBeNull();

      // Try to get wizards for non-existent user
      const wizards = await t.query(api.userProfiles.getUserWizards, {
        userId: "nonexistentuser",
      });

      expect(wizards).toEqual([]);
    });

    test("should handle user without completed profile setup", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-incomplete";

      // Create user but don't complete profile setup
      await createTestUser(t, clerkId);

      // Create a wizard for this user (should still work)
      await withAuth(t, clerkId).mutation(api.wizards.createWizard, {
        name: "Test Wizard",
        description: "A test wizard",
      });

      // Try to get profile - should return null since no userId set
      const profile = await t.query(api.userProfiles.getUserProfile, {
        userId: "somehandle",
      });

      expect(profile).toBeNull();

      // Profile status should show incomplete
      const status = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(status.hasProfile).toBe(false);
    });
  });

  describe("User ID Availability and Assignment", () => {
    test("should validate user ID format requirements", async () => {
      const t = convexTest(schema);

      // Test too short
      const tooShort = await t.query(api.userProfiles.checkUserIdAvailability, {
        userId: "ab",
      });
      expect(tooShort.available).toBe(false);
      expect(tooShort.valid).toBe(false);
      expect(tooShort.error).toBe("User ID must be at least 3 characters long");

      // Test too long
      const tooLong = await t.query(api.userProfiles.checkUserIdAvailability, {
        userId: "a".repeat(21),
      });
      expect(tooLong.available).toBe(false);
      expect(tooLong.valid).toBe(false);
      expect(tooLong.error).toBe(
        "User ID must be no more than 20 characters long"
      );

      // Test invalid characters
      const invalidChars = await t.query(
        api.userProfiles.checkUserIdAvailability,
        { userId: "user@name" }
      );
      expect(invalidChars.available).toBe(false);
      expect(invalidChars.valid).toBe(false);
      expect(invalidChars.error).toBe(
        "User ID can only contain letters, numbers, underscores, and hyphens"
      );

      // Test reserved word
      const reserved = await t.query(api.userProfiles.checkUserIdAvailability, {
        userId: "admin",
      });
      expect(reserved.available).toBe(false);
      expect(reserved.valid).toBe(false);
      expect(reserved.error).toBe(
        "This user ID is reserved and cannot be used"
      );

      // Test valid format
      const valid = await t.query(api.userProfiles.checkUserIdAvailability, {
        userId: "valid_user-123",
      });
      expect(valid.available).toBe(true);
      expect(valid.valid).toBe(true);
      expect(valid.error).toBeUndefined();
    });

    test("should generate helpful suggestions for taken user IDs", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-suggestions";

      await createTestUser(t, clerkId);

      // Claim a user ID
      await withAuth(t, clerkId).mutation(api.userProfiles.setUserId, {
        userId: "popular",
        displayName: "Popular User",
      });

      // Check availability for the same ID
      const availability = await t.query(
        api.userProfiles.checkUserIdAvailability,
        { userId: "popular" }
      );

      expect(availability.available).toBe(false);
      expect(availability.valid).toBe(true);
      expect(availability.suggestions).toBeDefined();
      expect(availability.suggestions?.length).toBeGreaterThan(0);

      // Suggestions should include variations
      const suggestions = availability.suggestions!;
      expect(suggestions.some((s) => s.includes("popular"))).toBe(true);
      expect(suggestions.some((s) => /\d/.test(s))).toBe(true); // Should contain numbers
    });

    test("should prevent user ID changes after initial setup", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-immutable";

      await createTestUser(t, clerkId);

      // Set initial user ID
      const initialSetup = await withAuth(t, clerkId).mutation(
        api.userProfiles.setUserId,
        {
          userId: "originalhandle",
          displayName: "Original Name",
        }
      );
      expect(initialSetup.success).toBe(true);

      // Try to change user ID
      const changeAttempt = await withAuth(t, clerkId).mutation(
        api.userProfiles.setUserId,
        {
          userId: "newhandle",
          displayName: "New Name",
        }
      );
      expect(changeAttempt.success).toBe(false);
      expect(changeAttempt.error).toBe(
        "User ID has already been set and cannot be changed"
      );

      // Verify original user ID is still set
      const status = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(status.userId).toBe("originalhandle");
    });

    test("should handle concurrent user ID assignment attempts", async () => {
      const t = convexTest(schema);
      const clerkId1 = "test-user-concurrent-1";
      const clerkId2 = "test-user-concurrent-2";

      await createTestUser(t, clerkId1);
      await createTestUser(t, clerkId2);

      // Both users try to claim the same handle simultaneously
      const [result1, result2] = await Promise.all([
        withAuth(t, clerkId1).mutation(api.userProfiles.setUserId, {
          userId: "contested",
          displayName: "User One",
        }),
        withAuth(t, clerkId2).mutation(api.userProfiles.setUserId, {
          userId: "contested",
          displayName: "User Two",
        }),
      ]);

      // One should succeed, one should fail
      const results = [result1, result2];
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // The failed attempt should have the correct error message
      const failedResult = results.find((r) => !r.success);
      expect(failedResult?.error).toBe("This user ID is already taken");
    });
  });

  describe("Profile Editing Workflow", () => {
    test("should allow updating display name after profile setup", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-edit";

      await createTestUser(t, clerkId);

      // Complete initial profile setup
      await withAuth(t, clerkId).mutation(api.userProfiles.setUserId, {
        userId: "editableuser",
        displayName: "Original Name",
      });

      // Update display name
      const updateResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "Updated Name",
        }
      );
      expect(updateResult.success).toBe(true);

      // Verify the change
      const status = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(status.displayName).toBe("Updated Name");
      expect(status.userId).toBe("editableuser"); // Should remain unchanged

      // Verify public profile reflects the change
      const publicProfile = await t.query(api.userProfiles.getUserProfile, {
        userId: "editableuser",
      });
      expect(publicProfile?.displayName).toBe("Updated Name");
    });

    test("should validate display name updates", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-validation";

      await createTestUser(t, clerkId);
      await withAuth(t, clerkId).mutation(api.userProfiles.setUserId, {
        userId: "validationuser",
        displayName: "Valid Name",
      });

      // Test empty display name
      const emptyResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "",
        }
      );
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toBe("Display name cannot be empty");

      // Test too long display name
      const tooLongResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "a".repeat(51),
        }
      );
      expect(tooLongResult.success).toBe(false);
      expect(tooLongResult.error).toBe(
        "Display name must be 50 characters or less"
      );

      // Test whitespace handling
      const whitespaceResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "  Trimmed Name  ",
        }
      );
      expect(whitespaceResult.success).toBe(true);

      // Verify trimming worked
      const status = await withAuth(t, clerkId).query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(status.displayName).toBe("Trimmed Name");
    });

    test("should prevent profile editing before setup completion", async () => {
      const t = convexTest(schema);
      const clerkId = "test-user-incomplete-edit";

      await createTestUser(t, clerkId);

      // Try to update profile before completing setup
      const updateResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "New Name",
        }
      );
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe(
        "Profile setup must be completed before editing"
      );
    });
  });

  describe("Authentication and Authorization", () => {
    test("should require authentication for profile operations", async () => {
      const t = convexTest(schema);

      // Try profile operations without authentication
      const statusResult = await t.query(
        api.userProfiles.getCurrentUserProfileStatus,
        {}
      );
      expect(statusResult.hasProfile).toBe(false);

      // These should fail gracefully or return appropriate errors
      const setUserIdResult = await t.mutation(api.userProfiles.setUserId, {
        userId: "testhandle",
        displayName: "Test User",
      });
      expect(setUserIdResult.success).toBe(false);
      expect(setUserIdResult.error).toBe("Not authenticated");

      const updateResult = await t.mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "New Name",
        }
      );
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe("Not authenticated");
    });

    test("should handle missing user records gracefully", async () => {
      const t = convexTest(schema);
      const clerkId = "nonexistent-user";

      // Try operations with authenticated but non-existent user
      const setUserIdResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.setUserId,
        {
          userId: "testhandle",
          displayName: "Test User",
        }
      );
      expect(setUserIdResult.success).toBe(false);
      expect(setUserIdResult.error).toBe("User record not found");

      const updateResult = await withAuth(t, clerkId).mutation(
        api.userProfiles.updateUserProfile,
        {
          displayName: "New Name",
        }
      );
      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe("User record not found");
    });
  });
});
