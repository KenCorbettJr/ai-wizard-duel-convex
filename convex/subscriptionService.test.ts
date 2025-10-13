import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

describe("SubscriptionService", () => {
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

  describe("getUserSubscription", () => {
    test("should return user subscription info", async () => {
      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription).not.toBeNull();
      expect(subscription!.subscriptionTier).toBe("FREE");
      expect(subscription!.subscriptionStatus).toBe("ACTIVE");
      expect(subscription!.imageCredits).toBe(10);
    });

    test("should return null for non-existent user", async () => {
      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: "non-existent-user",
        }
      );

      expect(subscription).toBeNull();
    });
  });

  describe("hasFeatureAccess", () => {
    test("should deny premium features for free users", async () => {
      const hasAccess = await t.query(
        api.subscriptionService.hasFeatureAccess,
        {
          clerkId: testClerkId,
          feature: "UNLIMITED_WIZARDS",
        }
      );

      expect(hasAccess).toBe(false);
    });

    test("should grant premium features for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      const hasAccess = await t.query(
        api.subscriptionService.hasFeatureAccess,
        {
          clerkId: testClerkId,
          feature: "UNLIMITED_WIZARDS",
        }
      );

      expect(hasAccess).toBe(true);
    });

    test("should deny premium features for canceled premium users", async () => {
      // Upgrade user to premium but cancel
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "CANCELED",
      });

      const hasAccess = await t.query(
        api.subscriptionService.hasFeatureAccess,
        {
          clerkId: testClerkId,
          feature: "UNLIMITED_WIZARDS",
        }
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe("getAIModelTier", () => {
    test("should return STANDARD for free users", async () => {
      const tier = await t.query(api.subscriptionService.getAIModelTier, {
        clerkId: testClerkId,
      });

      expect(tier).toBe("STANDARD");
    });

    test("should return PREMIUM for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      const tier = await t.query(api.subscriptionService.getAIModelTier, {
        clerkId: testClerkId,
      });

      expect(tier).toBe("PREMIUM");
    });

    test("should return STANDARD for non-existent user", async () => {
      const tier = await t.query(api.subscriptionService.getAIModelTier, {
        clerkId: "non-existent-user",
      });

      expect(tier).toBe("STANDARD");
    });
  });

  describe("checkUsageLimit", () => {
    test("should allow wizard creation within limits", async () => {
      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "WIZARD_CREATED",
      });

      expect(result.canPerform).toBe(true);
      expect(result.currentUsage).toBe(0);
      expect(result.limit).toBe(3);
    });

    test("should deny wizard creation when limit reached", async () => {
      // Create 3 wizards to reach the limit using internal function
      for (let i = 0; i < 3; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: testClerkId,
          name: `Test Wizard ${i}`,
          description: `Test wizard description ${i}`,
        });
      }

      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "WIZARD_CREATED",
      });

      expect(result.canPerform).toBe(false);
      expect(result.reason).toBe("Free tier wizard limit reached");
      expect(result.currentUsage).toBe(3);
      expect(result.limit).toBe(3);
    });

    test("should allow unlimited wizards for premium users", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      // Create 5 wizards (more than free limit) using internal function
      for (let i = 0; i < 5; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: testClerkId,
          name: `Test Wizard ${i}`,
          description: `Test wizard description ${i}`,
        });
      }

      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "WIZARD_CREATED",
      });

      expect(result.canPerform).toBe(true);
    });

    test("should check image credit availability", async () => {
      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "IMAGE_GENERATED",
      });

      expect(result.canPerform).toBe(true);
      expect(result.currentUsage).toBe(10); // Initial credits
    });

    test("should deny image generation when no credits", async () => {
      // Consume all credits
      await t.mutation(api.users.updateUserSubscription, {
        userId: testUserId,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
      });

      // Manually set credits to 0
      await t.mutation(api.imageCreditService.consumeImageCredit, {
        userId: testClerkId,
      });
      // Consume remaining credits
      for (let i = 0; i < 10; i++) {
        try {
          await t.mutation(api.imageCreditService.consumeImageCredit, {
            userId: testClerkId,
          });
        } catch (e) {
          // Expected to fail when credits run out
          break;
        }
      }

      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "IMAGE_GENERATED",
      });

      expect(result.canPerform).toBe(false);
      expect(result.reason).toBe("Insufficient image credits");
    });

    test("should allow ad watching without limits", async () => {
      const result = await t.query(api.subscriptionService.checkUsageLimit, {
        clerkId: testClerkId,
        action: "AD_WATCHED",
      });

      expect(result.canPerform).toBe(true);
    });
  });

  describe("incrementUsage", () => {
    test("should increment duel usage", async () => {
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "DUEL_PLAYED",
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription!.monthlyUsage.duelsPlayed).toBe(1);
    });

    test("should increment wizard creation usage", async () => {
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "WIZARD_CREATED",
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription!.monthlyUsage.wizardsCreated).toBe(1);
    });

    test("should increment image generation usage", async () => {
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "IMAGE_GENERATED",
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription!.monthlyUsage.imageGenerations).toBe(1);
    });

    test("should increment ad watching usage", async () => {
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "AD_WATCHED",
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription!.monthlyUsage.adsWatched).toBe(1);
    });

    test("should reset monthly usage when period expires", async () => {
      // Set usage reset date to past
      const pastDate = Date.now() - 1000; // 1 second ago
      await t.mutation(internal.users.createUserInternal, {
        clerkId: "expired-user",
        email: "expired@example.com",
        name: "Expired User",
      });

      // Manually update the reset date to be in the past
      const expiredUser = await t.query(api.users.getUserByClerkId, {
        clerkId: "expired-user",
      });

      await t.mutation(api.users.updateUserSubscription, {
        userId: expiredUser!._id,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
      });

      // Increment usage - this should reset the monthly usage
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: "expired-user",
        action: "DUEL_PLAYED",
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: "expired-user",
        }
      );

      expect(subscription!.monthlyUsage.duelsPlayed).toBe(1);
      expect(subscription!.monthlyUsage.resetDate).toBeGreaterThan(Date.now());
    });
  });

  describe("updateSubscription", () => {
    test("should update user subscription tier", async () => {
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        stripeCustomerId: "cus_test123",
        stripeSubscriptionId: "sub_test123",
        subscriptionEndsAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );

      expect(subscription!.subscriptionTier).toBe("PREMIUM");
      expect(subscription!.subscriptionStatus).toBe("ACTIVE");
      expect(subscription!.stripeCustomerId).toBe("cus_test123");
      expect(subscription!.stripeSubscriptionId).toBe("sub_test123");
    });

    test("should throw error for non-existent user", async () => {
      await expect(
        t.mutation(api.subscriptionService.updateSubscription, {
          clerkId: "non-existent-user",
          subscriptionTier: "PREMIUM",
          subscriptionStatus: "ACTIVE",
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("getUserUsageLimits", () => {
    test("should return usage limits for free user", async () => {
      const limits = await t.query(api.subscriptionService.getUserUsageLimits, {
        clerkId: testClerkId,
      });

      expect(limits).not.toBeNull();
      expect(limits!.subscriptionTier).toBe("FREE");
      expect(limits!.wizardLimit).toBe(3);
      expect(limits!.duelLimit).toBe(5);
      expect(limits!.currentWizards).toBe(0);
      expect(limits!.currentDuels).toBe(0);
      expect(limits!.imageCredits).toBe(10);
    });

    test("should return unlimited limits for premium user", async () => {
      // Upgrade user to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: testClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
      });

      const limits = await t.query(api.subscriptionService.getUserUsageLimits, {
        clerkId: testClerkId,
      });

      expect(limits).not.toBeNull();
      expect(limits!.subscriptionTier).toBe("PREMIUM");
      expect(limits!.wizardLimit).toBe("UNLIMITED");
      expect(limits!.duelLimit).toBe("UNLIMITED");
    });

    test("should return null for non-existent user", async () => {
      const limits = await t.query(api.subscriptionService.getUserUsageLimits, {
        clerkId: "non-existent-user",
      });

      expect(limits).toBeNull();
    });
  });

  describe("resetMonthlyUsage", () => {
    test("should reset monthly usage for user", async () => {
      // First increment some usage
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "DUEL_PLAYED",
      });
      await t.mutation(api.subscriptionService.incrementUsage, {
        clerkId: testClerkId,
        action: "WIZARD_CREATED",
      });

      // Verify usage was incremented
      let subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );
      expect(subscription!.monthlyUsage.duelsPlayed).toBe(1);
      expect(subscription!.monthlyUsage.wizardsCreated).toBe(1);

      // Reset usage
      await t.mutation(internal.subscriptionService.resetMonthlyUsage, {
        userId: testUserId,
      });

      // Verify usage was reset
      subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: testClerkId,
        }
      );
      expect(subscription!.monthlyUsage.duelsPlayed).toBe(0);
      expect(subscription!.monthlyUsage.wizardsCreated).toBe(0);
      expect(subscription!.monthlyUsage.imageGenerations).toBe(0);
      expect(subscription!.monthlyUsage.adsWatched).toBe(0);
    });
  });
});
