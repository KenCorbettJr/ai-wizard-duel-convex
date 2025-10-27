import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { withAuth } from "./test_utils";

test("duel-level image credit consumption", async () => {
  const t = convexTest(schema);

  // Create test users
  await t.mutation(api.users.getOrCreateUser, {
    clerkId: "free_user_123",
    email: "free@example.com",
    name: "Free User",
  });

  const premiumUserId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "premium_user_123",
    email: "premium@example.com",
    name: "Premium User",
  });

  // Set premium user subscription
  await t.mutation(api.users.updateUserSubscription, {
    userId: premiumUserId,
    subscriptionTier: "PREMIUM",
    subscriptionStatus: "ACTIVE",
    stripeCustomerId: "cus_premium123",
    stripeSubscriptionId: "sub_premium123",
  });

  // Create wizards for testing
  const wizard1Id = await withAuth(t, "free_user_123").mutation(
    api.wizards.createWizard,
    {
      name: "Test Wizard 1",
      description: "A test wizard",
    }
  );

  const wizard2Id = await withAuth(t, "free_user_123").mutation(
    api.wizards.createWizard,
    {
      name: "Test Wizard 2",
      description: "Another test wizard",
    }
  );

  // Create wizards for premium user
  const premiumWizard1Id = await withAuth(t, "premium_user_123").mutation(
    api.wizards.createWizard,
    {
      name: "Premium Wizard 1",
      description: "A premium test wizard",
    }
  );

  const premiumWizard2Id = await withAuth(t, "premium_user_123").mutation(
    api.wizards.createWizard,
    {
      name: "Premium Wizard 2",
      description: "Another premium test wizard",
    }
  );

  // Create a duel
  const duelId = await withAuth(t, "free_user_123").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    }
  );

  // Test 1: First credit consumption should succeed and consume 1 credit
  const initialCredits = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "free_user_123",
    }
  );
  expect(initialCredits).toBe(10); // Default signup bonus

  const firstConsumption = await t.mutation(
    api.imageCreditService.consumeImageCreditForDuel,
    {
      userId: "free_user_123",
      duelId,
      metadata: {
        purpose: "test_duel_images",
      },
    }
  );

  expect(firstConsumption.success).toBe(true);
  expect(firstConsumption.alreadyConsumed).toBe(false);
  expect(firstConsumption.reason).toBe("Credit consumed successfully");

  // Check that credit was consumed
  const creditsAfterFirst = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "free_user_123",
    }
  );
  expect(creditsAfterFirst).toBe(9);

  // Test 2: Second credit consumption for same duel should not consume another credit
  const secondConsumption = await t.mutation(
    api.imageCreditService.consumeImageCreditForDuel,
    {
      userId: "free_user_123",
      duelId,
      metadata: {
        purpose: "test_duel_images_round_2",
      },
    }
  );

  expect(secondConsumption.success).toBe(true);
  expect(secondConsumption.alreadyConsumed).toBe(true);
  expect(secondConsumption.reason).toContain(
    "Credit already consumed by user free_user_123"
  );

  // Check that no additional credit was consumed
  const creditsAfterSecond = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "free_user_123",
    }
  );
  expect(creditsAfterSecond).toBe(9);

  // Test 3: Premium user should work without consuming actual credits
  const premiumDuelId = await withAuth(t, "premium_user_123").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [premiumWizard1Id, premiumWizard2Id],
    }
  );

  const premiumConsumption = await t.mutation(
    api.imageCreditService.consumeImageCreditForDuel,
    {
      userId: "premium_user_123",
      duelId: premiumDuelId,
      metadata: {
        purpose: "premium_duel_images",
      },
    }
  );

  expect(premiumConsumption.success).toBe(true);
  expect(premiumConsumption.alreadyConsumed).toBe(false);
  expect(premiumConsumption.reason).toBe("Premium user - unlimited credits");

  // Premium user credits should remain unchanged
  const premiumCredits = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "premium_user_123",
    }
  );
  expect(premiumCredits).toBe(10); // Still has initial credits

  // Test 4: User with insufficient credits should fail
  // Consume all remaining credits
  for (let i = 0; i < 9; i++) {
    await t.mutation(api.imageCreditService.consumeImageCredit, {
      userId: "free_user_123",
    });
  }

  const brokeUserCredits = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "free_user_123",
    }
  );
  expect(brokeUserCredits).toBe(0);

  // Create another duel
  const newDuelId = await withAuth(t, "free_user_123").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id, wizard2Id],
    }
  );

  const brokeConsumption = await t.mutation(
    api.imageCreditService.consumeImageCreditForDuel,
    {
      userId: "free_user_123",
      duelId: newDuelId,
      metadata: {
        purpose: "broke_user_duel",
      },
    }
  );

  expect(brokeConsumption.success).toBe(false);
  expect(brokeConsumption.alreadyConsumed).toBe(false);
  expect(brokeConsumption.reason).toBe("Insufficient credits");
});
