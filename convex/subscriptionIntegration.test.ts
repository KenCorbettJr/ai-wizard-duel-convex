import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

describe("Subscription Integration Tests", () => {
  let t: ReturnType<typeof convexTest>;
  let freeUserId: Id<"users">;
  let premiumUserId: Id<"users">;
  let freeClerkId: string;
  let premiumClerkId: string;

  beforeEach(async () => {
    t = convexTest(schema);
    freeClerkId = "free-user-123";
    premiumClerkId = "premium-user-456";

    // Create a free user
    freeUserId = await t.mutation(internal.users.createUserInternal, {
      clerkId: freeClerkId,
      email: "free@example.com",
      name: "Free User",
    });

    // Create a premium user
    premiumUserId = await t.mutation(internal.users.createUserInternal, {
      clerkId: premiumClerkId,
      email: "premium@example.com",
      name: "Premium User",
      subscriptionTier: "PREMIUM",
      subscriptionStatus: "ACTIVE",
    });
  });

  describe("End-to-End User Journey", () => {
    test("should handle complete free user workflow", async () => {
      // 1. Check initial state
      const initialStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: freeClerkId,
        },
      );

      expect(initialStatus).not.toBeNull();
      expect(initialStatus!.subscriptionTier).toBe("FREE");
      expect(initialStatus!.wizards.canCreate).toBe(true);
      expect(initialStatus!.wizards.limit).toBe(3);
      expect(initialStatus!.duels.canStart).toBe(true);
      expect(initialStatus!.duels.limit).toBe(5);
      expect(initialStatus!.imageCredits.canGenerate).toBe(true);
      expect(initialStatus!.imageCredits.current).toBe(10);

      // 2. Create wizards up to limit
      for (let i = 0; i < 3; i++) {
        const canCreate = await t.query(
          api.usageLimiterService.canCreateWizard,
          {
            clerkId: freeClerkId,
          },
        );
        expect(canCreate.canCreate).toBe(true);

        await t.mutation(internal.wizards.createWizardInternal, {
          owner: freeClerkId,
          name: `Wizard ${i}`,
          description: `Description ${i}`,
        });

        await t.mutation(api.usageLimiterService.trackWizardCreation, {
          clerkId: freeClerkId,
        });
      }

      // 3. Verify wizard limit reached
      const wizardLimitReached = await t.query(
        api.usageLimiterService.canCreateWizard,
        {
          clerkId: freeClerkId,
        },
      );
      expect(wizardLimitReached.canCreate).toBe(false);
      expect(wizardLimitReached.reason).toContain(
        "Free tier wizard limit reached",
      );

      // 4. Play duels up to limit
      for (let i = 0; i < 5; i++) {
        const canStart = await t.query(api.usageLimiterService.canStartDuel, {
          clerkId: freeClerkId,
        });
        expect(canStart.canStart).toBe(true);

        await t.mutation(api.usageLimiterService.trackDuelParticipation, {
          clerkId: freeClerkId,
        });
      }

      // 5. Verify duel limit reached
      const duelLimitReached = await t.query(
        api.usageLimiterService.canStartDuel,
        {
          clerkId: freeClerkId,
        },
      );
      expect(duelLimitReached.canStart).toBe(false);
      expect(duelLimitReached.reason).toContain("Daily duel limit reached");

      // 6. Consume image credits
      for (let i = 0; i < 5; i++) {
        const canGenerate = await t.query(
          api.usageLimiterService.canGenerateImages,
          {
            clerkId: freeClerkId,
          },
        );
        expect(canGenerate.canGenerate).toBe(true);

        await t.mutation(api.imageCreditService.consumeImageCredit, {
          userId: freeClerkId,
        });
        // Note: consumeImageCredit already tracks the usage, no need to call trackImageGeneration
      }

      // 7. Verify remaining credits
      const remainingCredits = await t.query(
        api.usageLimiterService.canGenerateImages,
        {
          clerkId: freeClerkId,
        },
      );
      expect(remainingCredits.imageCredits).toBe(5);

      // 8. Check final usage status
      const finalStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: freeClerkId,
        },
      );
      expect(finalStatus!.wizards.canCreate).toBe(false);
      expect(finalStatus!.duels.canStart).toBe(false);
      expect(finalStatus!.imageCredits.current).toBe(5);
      expect(finalStatus!.monthlyUsage.wizardsCreated).toBe(3);
      expect(finalStatus!.monthlyUsage.duelsPlayed).toBe(5);
      expect(finalStatus!.monthlyUsage.imageGenerations).toBe(5);
    });

    test("should handle premium user unlimited access", async () => {
      // 1. Check initial premium state
      const initialStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: premiumClerkId,
        },
      );

      expect(initialStatus).not.toBeNull();
      expect(initialStatus!.subscriptionTier).toBe("PREMIUM");
      expect(initialStatus!.wizards.limit).toBe("UNLIMITED");
      expect(initialStatus!.duels.limit).toBe("UNLIMITED");
      expect(initialStatus!.imageCredits.isPremium).toBe(true);

      // 2. Create many wizards (beyond free limit)
      for (let i = 0; i < 10; i++) {
        const canCreate = await t.query(
          api.usageLimiterService.canCreateWizard,
          {
            clerkId: premiumClerkId,
          },
        );
        expect(canCreate.canCreate).toBe(true);
        expect(canCreate.limit).toBe("UNLIMITED");

        await t.mutation(internal.wizards.createWizardInternal, {
          owner: premiumClerkId,
          name: `Premium Wizard ${i}`,
          description: `Premium Description ${i}`,
        });

        await t.mutation(api.usageLimiterService.trackWizardCreation, {
          clerkId: premiumClerkId,
        });
      }

      // 3. Play many duels (beyond free limit)
      for (let i = 0; i < 15; i++) {
        const canStart = await t.query(api.usageLimiterService.canStartDuel, {
          clerkId: premiumClerkId,
        });
        expect(canStart.canStart).toBe(true);
        expect(canStart.limit).toBe("UNLIMITED");

        await t.mutation(api.usageLimiterService.trackDuelParticipation, {
          clerkId: premiumClerkId,
        });
      }

      // 4. Generate many images (premium users have unlimited)
      for (let i = 0; i < 20; i++) {
        const canGenerate = await t.query(
          api.usageLimiterService.canGenerateImages,
          {
            clerkId: premiumClerkId,
          },
        );
        expect(canGenerate.canGenerate).toBe(true);
        expect(canGenerate.isPremium).toBe(true);

        await t.mutation(api.usageLimiterService.trackImageGeneration, {
          clerkId: premiumClerkId,
        });
      }

      // 5. Verify unlimited access maintained
      const finalStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: premiumClerkId,
        },
      );
      expect(finalStatus!.wizards.canCreate).toBe(true);
      expect(finalStatus!.duels.canStart).toBe(true);
      expect(finalStatus!.imageCredits.canGenerate).toBe(true);
      expect(finalStatus!.monthlyUsage.wizardsCreated).toBe(10);
      expect(finalStatus!.monthlyUsage.duelsPlayed).toBe(15);
      expect(finalStatus!.monthlyUsage.imageGenerations).toBe(20);
    });

    test("should handle subscription upgrade workflow", async () => {
      // 1. Start as free user with limits reached
      for (let i = 0; i < 3; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: freeClerkId,
          name: `Wizard ${i}`,
          description: `Description ${i}`,
        });
      }

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.usageLimiterService.trackDuelParticipation, {
          clerkId: freeClerkId,
        });
      }

      // 2. Verify limits reached
      const beforeUpgrade = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: freeClerkId,
        },
      );
      expect(beforeUpgrade!.wizards.canCreate).toBe(false);
      expect(beforeUpgrade!.duels.canStart).toBe(false);

      // 3. Upgrade to premium
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: freeClerkId,
        subscriptionTier: "PREMIUM",
        subscriptionStatus: "ACTIVE",
        stripeCustomerId: "cus_test123",
        stripeSubscriptionId: "sub_test123",
      });

      // 4. Verify unlimited access after upgrade
      const afterUpgrade = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: freeClerkId,
        },
      );
      expect(afterUpgrade!.subscriptionTier).toBe("PREMIUM");
      expect(afterUpgrade!.wizards.canCreate).toBe(true);
      expect(afterUpgrade!.wizards.limit).toBe("UNLIMITED");
      expect(afterUpgrade!.duels.canStart).toBe(true);
      expect(afterUpgrade!.duels.limit).toBe("UNLIMITED");
      expect(afterUpgrade!.imageCredits.isPremium).toBe(true);

      // 5. Create additional wizards after upgrade
      for (let i = 3; i < 8; i++) {
        const canCreate = await t.query(
          api.usageLimiterService.canCreateWizard,
          {
            clerkId: freeClerkId,
          },
        );
        expect(canCreate.canCreate).toBe(true);

        await t.mutation(internal.wizards.createWizardInternal, {
          owner: freeClerkId,
          name: `Post-Upgrade Wizard ${i}`,
          description: `Post-Upgrade Description ${i}`,
        });
      }

      // 6. Verify final state
      const finalCheck = await t.query(
        api.usageLimiterService.canCreateWizard,
        {
          clerkId: freeClerkId,
        },
      );
      expect(finalCheck.canCreate).toBe(true);
      expect(finalCheck.currentCount).toBe(8);
      expect(finalCheck.limit).toBe("UNLIMITED");
    });

    test("should handle subscription downgrade workflow", async () => {
      // 1. Start as premium user with many resources
      for (let i = 0; i < 10; i++) {
        await t.mutation(internal.wizards.createWizardInternal, {
          owner: premiumClerkId,
          name: `Premium Wizard ${i}`,
          description: `Premium Description ${i}`,
        });
      }

      // 2. Verify premium access
      const beforeDowngrade = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: premiumClerkId,
        },
      );
      expect(beforeDowngrade!.wizards.canCreate).toBe(true);
      expect(beforeDowngrade!.wizards.limit).toBe("UNLIMITED");

      // 3. Downgrade to free
      await t.mutation(api.subscriptionService.updateSubscription, {
        clerkId: premiumClerkId,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
      });

      // 4. Verify free tier limits applied
      const afterDowngrade = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: premiumClerkId,
        },
      );
      expect(afterDowngrade!.subscriptionTier).toBe("FREE");
      expect(afterDowngrade!.wizards.limit).toBe(3);
      expect(afterDowngrade!.duels.limit).toBe(5);
      expect(afterDowngrade!.imageCredits.isPremium).toBe(false);

      // 5. Verify cannot create more wizards (already over limit)
      const canCreateAfterDowngrade = await t.query(
        api.usageLimiterService.canCreateWizard,
        {
          clerkId: premiumClerkId,
        },
      );
      expect(canCreateAfterDowngrade.canCreate).toBe(false);
      expect(canCreateAfterDowngrade.currentCount).toBe(10);
      expect(canCreateAfterDowngrade.reason).toContain(
        "Free tier wizard limit reached",
      );
    });
  });

  describe("Feature Access Control", () => {
    test("should correctly gate premium features", async () => {
      // Test free user feature access
      const freeFeatures = await Promise.all([
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: freeClerkId,
          feature: "UNLIMITED_WIZARDS",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: freeClerkId,
          feature: "UNLIMITED_DUELS",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: freeClerkId,
          feature: "PREMIUM_AI",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: freeClerkId,
          feature: "ADVANCED_CUSTOMIZATION",
        }),
      ]);

      expect(freeFeatures.every((access) => access === false)).toBe(true);

      // Test premium user feature access
      const premiumFeatures = await Promise.all([
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: premiumClerkId,
          feature: "UNLIMITED_WIZARDS",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: premiumClerkId,
          feature: "UNLIMITED_DUELS",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: premiumClerkId,
          feature: "PREMIUM_AI",
        }),
        t.query(api.subscriptionService.hasFeatureAccess, {
          clerkId: premiumClerkId,
          feature: "ADVANCED_CUSTOMIZATION",
        }),
      ]);

      expect(premiumFeatures.every((access) => access === true)).toBe(true);
    });

    test("should return correct AI model tiers", async () => {
      const freeTier = await t.query(api.subscriptionService.getAIModelTier, {
        clerkId: freeClerkId,
      });
      expect(freeTier).toBe("STANDARD");

      const premiumTier = await t.query(
        api.subscriptionService.getAIModelTier,
        {
          clerkId: premiumClerkId,
        },
      );
      expect(premiumTier).toBe("PREMIUM");
    });
  });

  describe("Usage Tracking Integration", () => {
    test("should track usage across all services", async () => {
      // Perform various actions
      await t.mutation(api.usageLimiterService.trackWizardCreation, {
        clerkId: freeClerkId,
      });
      await t.mutation(api.usageLimiterService.trackDuelParticipation, {
        clerkId: freeClerkId,
      });
      await t.mutation(api.usageLimiterService.trackImageGeneration, {
        clerkId: freeClerkId,
      });
      await t.mutation(api.usageLimiterService.trackAdWatching, {
        clerkId: freeClerkId,
      });

      // Verify tracking in subscription service
      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: freeClerkId,
        },
      );

      expect(subscription!.monthlyUsage.wizardsCreated).toBe(1);
      expect(subscription!.monthlyUsage.duelsPlayed).toBe(1);
      expect(subscription!.monthlyUsage.imageGenerations).toBe(1);
      expect(subscription!.monthlyUsage.adsWatched).toBe(1);

      // Verify tracking in usage limiter service
      const usageStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: freeClerkId,
        },
      );

      expect(usageStatus!.monthlyUsage.wizardsCreated).toBe(1);
      expect(usageStatus!.monthlyUsage.duelsPlayed).toBe(1);
      expect(usageStatus!.monthlyUsage.imageGenerations).toBe(1);
      expect(usageStatus!.monthlyUsage.adsWatched).toBe(1);
    });
  });

  describe("Error Handling", () => {
    test("should handle non-existent users gracefully", async () => {
      const nonExistentUser = "non-existent-user-789";

      const subscription = await t.query(
        api.subscriptionService.getUserSubscription,
        {
          clerkId: nonExistentUser,
        },
      );
      expect(subscription).toBeNull();

      const usageStatus = await t.query(
        api.usageLimiterService.getUserUsageStatus,
        {
          clerkId: nonExistentUser,
        },
      );
      expect(usageStatus).toBeNull();

      const canCreateWizard = await t.query(
        api.usageLimiterService.canCreateWizard,
        {
          clerkId: nonExistentUser,
        },
      );
      expect(canCreateWizard.canCreate).toBe(false);
      expect(canCreateWizard.reason).toBe("User not found");
    });

    test("should handle subscription update errors", async () => {
      await expect(
        t.mutation(api.subscriptionService.updateSubscription, {
          clerkId: "non-existent-user",
          subscriptionTier: "PREMIUM",
          subscriptionStatus: "ACTIVE",
        }),
      ).rejects.toThrow("User not found");
    });
  });
});
