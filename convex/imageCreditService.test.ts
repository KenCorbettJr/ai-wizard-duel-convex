import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

test("image credit service functionality", async () => {
  const t = convexTest(schema);

  // Create a test user first
  const userId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "test_user_123",
    email: "test@example.com",
    name: "Test User",
  });

  // Test getting user image credits
  const initialCredits = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "test_user_123",
    }
  );
  expect(initialCredits).toBe(10); // Initial credits from user creation

  // Test checking if user has credits for duel
  const hasCredits = await t.query(
    api.imageCreditService.hasImageCreditsForDuel,
    {
      userId: "test_user_123",
    }
  );
  expect(hasCredits).toBe(true);

  // Test consuming a credit
  const consumeResult = await t.mutation(
    api.imageCreditService.consumeImageCredit,
    {
      userId: "test_user_123",
      metadata: { reason: "test_duel_image" },
    }
  );
  expect(consumeResult).toBe(true);

  // Check credits after consumption
  const creditsAfterConsume = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "test_user_123",
    }
  );
  expect(creditsAfterConsume).toBe(9);

  // Test awarding credits
  await t.mutation(api.imageCreditService.awardImageCredit, {
    userId: "test_user_123",
    amount: 5,
    source: "ADMIN_GRANT",
    metadata: { reason: "test_award" },
  });

  const creditsAfterAward = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "test_user_123",
    }
  );
  expect(creditsAfterAward).toBe(14);

  // Test credit history
  const history = await t.query(api.imageCreditService.getImageCreditHistory, {
    userId: "test_user_123",
    limit: 10,
  });
  expect(history.length).toBeGreaterThan(0);
  expect(history[0].type).toBe("EARNED"); // Most recent should be the award
  expect(history[0].amount).toBe(5);

  // Test cooldown check for ad rewards
  const cooldownCheck = await t.query(
    api.imageCreditService.canEarnCreditFromAd,
    {
      userId: "test_user_123",
    }
  );
  expect(cooldownCheck.canEarn).toBe(true);
  expect(cooldownCheck.cooldownRemaining).toBe(0);
});

test("premium user unlimited credits", async () => {
  const t = convexTest(schema);

  // Create a premium user
  const userId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "premium_user_123",
    email: "premium@example.com",
    name: "Premium User",
  });

  // Manually update user to premium status
  const user = await t.query(api.users.getUserByClerkId, {
    clerkId: "premium_user_123",
  });

  if (user) {
    await t.mutation(internal.users.updateUserSubscription, {
      userId: user._id,
      subscriptionTier: "PREMIUM",
      subscriptionStatus: "ACTIVE",
    });
  }

  // Test that premium user has unlimited credits
  const hasCredits = await t.query(
    api.imageCreditService.hasImageCreditsForDuel,
    {
      userId: "premium_user_123",
    }
  );
  expect(hasCredits).toBe(true);

  // Test consuming credits as premium user (should always succeed)
  const consumeResult = await t.mutation(
    api.imageCreditService.consumeImageCredit,
    {
      userId: "premium_user_123",
      metadata: { reason: "premium_test" },
    }
  );
  expect(consumeResult).toBe(true);

  // Credits should remain the same for premium users
  const creditsAfter = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "premium_user_123",
    }
  );
  expect(creditsAfter).toBe(10); // Should still have initial credits
});

test("ad reward processing", async () => {
  const t = convexTest(schema);

  // Create a test user
  await t.mutation(api.users.getOrCreateUser, {
    clerkId: "ad_user_123",
    email: "aduser@example.com",
    name: "Ad User",
  });

  // Create a completed video reward ad interaction
  const adInteractionId = await t.mutation(api.adService.trackAdInteraction, {
    userId: "ad_user_123",
    sessionId: "test_session_456",
    adType: "VIDEO_REWARD",
    placement: "CREDIT_REWARD",
    action: "COMPLETION",
    adNetworkId: "test_network",
    revenue: 100, // 1 dollar in cents
  });

  // Process the ad reward
  const rewardResult = await t.mutation(
    api.imageCreditService.processAdRewardCredit,
    {
      userId: "ad_user_123",
      adInteractionId,
    }
  );

  expect(rewardResult.success).toBe(true);
  expect(rewardResult.creditsAwarded).toBe(1);
  expect(rewardResult.message).toContain("earned");

  // Check that credits were added
  const creditsAfterReward = await t.query(
    api.imageCreditService.getUserImageCredits,
    {
      userId: "ad_user_123",
    }
  );
  expect(creditsAfterReward).toBe(11); // 10 initial + 1 from ad

  // Test cooldown - immediate second attempt should fail
  const secondRewardResult = await t.mutation(
    api.imageCreditService.processAdRewardCredit,
    {
      userId: "ad_user_123",
      adInteractionId,
    }
  );

  expect(secondRewardResult.success).toBe(false);
  expect(secondRewardResult.message).toContain("wait");
});

test("credit consumption when out of credits", async () => {
  const t = convexTest(schema);

  // Create a user with no credits
  const userId = await t.mutation(api.users.getOrCreateUser, {
    clerkId: "broke_user_123",
    email: "broke@example.com",
    name: "Broke User",
  });

  // Consume all initial credits
  for (let i = 0; i < 10; i++) {
    await t.mutation(api.imageCreditService.consumeImageCredit, {
      userId: "broke_user_123",
    });
  }

  // Verify user has no credits
  const credits = await t.query(api.imageCreditService.getUserImageCredits, {
    userId: "broke_user_123",
  });
  expect(credits).toBe(0);

  // Test that user cannot consume more credits
  const consumeResult = await t.mutation(
    api.imageCreditService.consumeImageCredit,
    {
      userId: "broke_user_123",
    }
  );
  expect(consumeResult).toBe(false);

  // Test that user cannot start duel without credits
  const hasCreditsForDuel = await t.query(
    api.imageCreditService.hasImageCreditsForDuel,
    {
      userId: "broke_user_123",
    }
  );
  expect(hasCreditsForDuel).toBe(false);
});
