import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

describe("UsageLimiterService", () => {
  let t: ReturnType<typeof convexTest>;
  let testUserId: Id<"users">;
  let testClerkId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    testClerkId = "test-clerk-id-123";

    // Create a test user
    testUserId = await t.mutation(internal.users.createUserInternal, {
      clerkId: testClerkId,
      email: "test@example.com",
      name: "Test User",
    });
  });

  describe("canCreateWizard", () => {
    test("should allow wizard creation for free users within limits", async () => {
      const result = await t.query(api.usageLimiterService.canCreateWizard, {
        clerkId: testClerkId,
      });

      expect(result.canCreate).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(3);
    });

    test("should deny wizard creation when free limit reached", async () => {
      // Create 3 wizards to reach the limit
      for (let i = 0; i < 3; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: testClerkId,
          name: `Test Wizard ${i}`,
          description: `Test wizard description ${i}`,
        });
      }

      const result = await t.query(api.usageLimiterService.canCreateWizard, {
        clerkId: testClerkId,
      });

      expect(result.canCreate).toBe(false);
      expect(result.reason).toContain("Free tier wizard limit reached");
      expect(result.currentCount).toBe(3);
      expect(result.limit).toBe(3);
    });

    test("should allow unlimited wizards for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      // Create 5 wizards (more than free limit)
      for (let i = 0; i < 5; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: testClerkId,
          name: `Test Wizard ${i}`,
          description: `Test wizard description ${i}`,
        });
      }

      const result = await t.query(api.usageLimiterService.canCreateWizard, {
        clerkId: testClerkId,
      });

      expect(result.canCreate).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe("UNLIMITED");
    });

    test("should return error for non-existent user", async () => {
      const result = await t.query(api.usageLimiterService.canCreateWizard, {
        clerkId: "non-existent-user",
      });

      expect(result.canCreate).toBe(false);
      expect(result.reason).toBe("User not found");
    });
  });

  describe("canStartDuel", () => {
    test("should allow duel participation for registered users within limits", async () => {
      const result = await t.query(api.usageLimiterService.canStartDuel, {
        clerkId: testClerkId,
      });

      expect(result.canStart).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(5);
    });

    test("should deny duel participation when daily limit reached", async () => {
      // Simulate 5 duels played
      for (let i = 0; i < 5; i++) {
        await t.mutation(api.subscriptionService.incrementUsage, {
          clerkId: testClerkId,
          action: "DUEL_PLAYED",
        });
      }

      const result = await t.query(api.usageLimiterService.canStartDuel, {
        clerkId: testClerkId,
      });

      expect(result.canStart).toBe(false);
      expect(result.reason).toContain("Daily duel limit reached");
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe(5);
    });

    test("should allow unlimited duels for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      // Simulate 10 duels played (more than free limit)
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.subscriptionService.incrementUsage, {
          clerkId: testClerkId,
          action: "DUEL_PLAYED",
        });
      }

      const result = await t.query(api.usageLimiterService.canStartDuel, {
        clerkId: testClerkId,
      });

      expect(result.canStart).toBe(true);
      expect(result.limit).toBe("UNLIMITED");
    });

    test("should require registration for anonymous users", async () => {
      const result = await t.query(api.usageLimiterService.canStartDuel, {
        clerkId: "non-existent-user",
      });

      expect(result.canStart).toBe(false);
      expect(result.reason).toBe(
        "Registration required to participate in duels",
      );
    });
  });

  describe("canGenerateImages", () => {
    test("should allow image generation when user has credits", async () => {
      const result = await t.query(api.usageLimiterService.canGenerateImages, {
        clerkId: testClerkId,
      });

      expect(result.canGenerate).toBe(true);
      expect(result.imageCredits).toBe(10);
      expect(result.isPremium).toBe(false);
    });

    test("should deny image generation when no credits", async () => {
      // Consume all credits
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.imageCreditService.consumeImageCredit, {
          userId: testClerkId,
        });
      }

      const result = await t.query(api.usageLimiterService.canGenerateImages, {
        clerkId: testClerkId,
      });

      expect(result.canGenerate).toBe(false);
      expect(result.reason).toContain("Insufficient image credits");
      expect(result.imageCredits).toBe(0);
      expect(result.isPremium).toBe(false);
    });

    test("should allow unlimited image generation for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      // Even with 0 credits, premium users can generate images
      for (let i = 0; i < 10; i++) {
        await t.mutation(api.imageCreditService.consumeImageCredit, {
          userId: testClerkId,
        });
      }

      const result = await t.query(api.usageLimiterService.canGenerateImages, {
        clerkId: testClerkId,
      });

      expect(result.canGenerate).toBe(true);
      expect(result.isPremium).toBe(true);
    });

    test("should return error for non-existent user", async () => {
      const result = await t.query(api.usageLimiterService.canGenerateImages, {
        clerkId: "non-existent-user",
      });

      expect(result.canGenerate).toBe(false);
      expect(result.reason).toBe("User not found");
    });
  });

  describe("tracking functions", () => {
    test("should track wizard creation", async () => {
      await t.mutation(api.usageLimiterService.trackWizardCreation, {
        clerkId: testClerkId,
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        },
      );

      expect(subscription!.monthlyUsage.wizardsCreated).toBe(1);
    });

    test("should track duel participation", async () => {
      await t.mutation(api.usageLimiterService.trackDuelParticipation, {
        clerkId: testClerkId,
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        },
      );

      expect(subscription!.monthlyUsage.duelsPlayed).toBe(1);
    });

    test("should track image generation", async () => {
      await t.mutation(api.usageLimiterService.trackImageGeneration, {
        clerkId: testClerkId,
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        },
      );

      expect(subscription!.monthlyUsage.imageGenerations).toBe(1);
    });

    test("should track ad watching", async () => {
      await t.mutation(api.usageLimiterService.trackAdWatching, {
        clerkId: testClerkId,
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        },
      );

      expect(subscription!.monthlyUsage.adsWatched).toBe(1);
    });
  });

  describe("getUserUsageStatus", () => {
    test("should return comprehensive usage status for free user", async () => {
      const status = await t.query(api.usageLimiterService.getUserUsageStatus, {
        clerkId: testClerkId,
      });

      expect(status).not.toBeNull();
      expect(status!.subscriptionTier).toBe("FREE");
      expect(status!.wizards.limit).toBe(3);
      expect(status!.duels.limit).toBe(5);
      expect(status!.wizards.canCreate).toBe(true);
      expect(status!.duels.canStart).toBe(true);
      expect(status!.imageCredits.canGenerate).toBe(true);
      expect(status!.imageCredits.isPremium).toBe(false);
    });

    test("should return comprehensive usage status for premium user", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      const status = await t.query(api.usageLimiterService.getUserUsageStatus, {
        clerkId: testClerkId,
      });

      expect(status).not.toBeNull();
      expect(status!.subscriptionTier).toBe("PREMIUM");
      expect(status!.wizards.limit).toBe("UNLIMITED");
      expect(status!.duels.limit).toBe("UNLIMITED");
      expect(status!.imageCredits.isPremium).toBe(true);
    });

    test("should return null for non-existent user", async () => {
      const status = await t.query(api.usageLimiterService.getUserUsageStatus, {
        clerkId: "non-existent-user",
      });

      expect(status).toBeNull();
    });
  });

  describe("canWatchRewardAd", () => {
    test("should allow ad watching when no previous interactions", async () => {
      const result = await t.query(api.usageLimiterService.canWatchRewardAd, {
        clerkId: testClerkId,
      });

      expect(result.canWatch).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.cooldownEndsAt).toBeUndefined();
    });

    test("should enforce cooldown after ad completion", async () => {
      // Create a recent ad interaction
      await t.mutation(api.adService.trackAdInteraction, {
        userId: testClerkId,
        sessionId: "test-session",
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "COMPLETION",
        adNetworkId: "test-network",
      });

      const result = await t.query(api.usageLimiterService.canWatchRewardAd, {
        clerkId: testClerkId,
      });

      expect(result.canWatch).toBe(false);
      expect(result.reason).toContain("Ad reward cooldown active");
      expect(result.cooldownEndsAt).toBeDefined();
    });

    test("should allow ad watching after cooldown expires", async () => {
      // Create an old ad interaction (beyond cooldown)
      const oldTimestamp = Date.now() - 400000; // 6+ minutes ago
      await t.mutation(internal.adService.createAdInteractionInternal, {
        userId: testClerkId,
        sessionId: "test-session",
        adType: "VIDEO_REWARD",
        placement: "CREDIT_REWARD",
        action: "COMPLETION",
        adNetworkId: "test-network",
        createdAt: oldTimestamp,
      });

      const result = await t.query(api.usageLimiterService.canWatchRewardAd, {
        clerkId: testClerkId,
      });

      expect(result.canWatch).toBe(true);
    });
  });
});
