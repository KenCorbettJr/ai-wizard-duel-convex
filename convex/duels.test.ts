import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

import { withAuth } from "./test_utils";

describe("Duels", () => {
  test("should create a duel with correct initial values", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    // Create wizards directly in database
    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });

    expect(duel).toMatchObject({
      numberOfRounds: 3,
      wizards: [wizard1Id],
      players: ["test-user-1"],
      status: "WAITING_FOR_PLAYERS",
      currentRound: 1,
    });

    // Check initial points and hit points
    expect(duel?.points[wizard1Id]).toBe(0);
    expect(duel?.hitPoints[wizard1Id]).toBe(100);

    // Check shortcode is generated
    expect(duel?.shortcode).toBeTruthy();
    expect(duel?.shortcode).toHaveLength(6);
  });

  test("should find duel by shortcode", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });
    const shortcode = duel?.shortcode as string;

    const foundDuel = await t.query(api.duels.getDuelByShortcode, {
      shortcode,
    });

    expect(foundDuel?._id).toBe(duelId);
  });

  test("should get player duels", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duel1Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const duel2Id = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 5,
        wizards: [wizard2Id],
      }
    );

    const user1Duels = await withAuth(t, "test-user-1").query(
      api.duels.getPlayerDuels,
      {}
    );

    expect(user1Duels).toHaveLength(2);
    expect(user1Duels.map((d) => d._id)).toContain(duel1Id);
    expect(user1Duels.map((d) => d._id)).toContain(duel2Id);
  });

  test("should cancel a duel", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const duelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    await t.mutation(api.duels.cancelDuel, { duelId });

    const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
      duelId,
    });
    expect(duel?.status).toBe("CANCELLED");
  });

  test("should get active duels", async () => {
    const t = convexTest(schema, import.meta.glob("./**/*.*s"));

    const wizard1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-1",
        name: "Gandalf",
        description: "A wise wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    const wizard2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: "test-user-2",
        name: "Saruman",
        description: "A powerful wizard",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    // Create duels with different statuses
    const waitingDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    const inProgressDuelId = await withAuth(t, "test-user-2").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard2Id],
      }
    );

    const completedDuelId = await withAuth(t, "test-user-1").mutation(
      api.duels.createDuel,
      {
        numberOfRounds: 3,
        wizards: [wizard1Id],
      }
    );

    // Set statuses
    await t.run(async (ctx) => {
      await ctx.db.patch(inProgressDuelId, { status: "IN_PROGRESS" });
      await ctx.db.patch(completedDuelId, { status: "COMPLETED" });
    });

    const activeDuels = await t.query(api.duels.getActiveDuels, {});

    expect(activeDuels).toHaveLength(2);
    expect(activeDuels.map((d) => d._id)).toContain(waitingDuelId);
    expect(activeDuels.map((d) => d._id)).toContain(inProgressDuelId);
    expect(activeDuels.map((d) => d._id)).not.toContain(completedDuelId);
  });
});
test("should get completed duels for a player", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create wizards
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create a completed duel
  const completedDuelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Manually set the duel as completed
  await t.run(async (ctx) => {
    await ctx.db.patch(completedDuelId, {
      status: "COMPLETED",
      winners: [wizard1Id],
      losers: [],
    });
  });

  // Create an in-progress duel (should not appear in completed duels)
  await withAuth(t, "test-user-1").mutation(api.duels.createDuel, {
    numberOfRounds: 3,
    wizards: [wizard1Id],
  });

  // Get completed duels for user1
  const user1CompletedDuels = await withAuth(t, "test-user-1").query(
    api.duels.getPlayerCompletedDuels,
    {}
  );

  expect(user1CompletedDuels).toHaveLength(1);
  expect(user1CompletedDuels[0]._id).toBe(completedDuelId);
  expect(user1CompletedDuels[0].status).toBe("COMPLETED");

  // Get completed duels for a user with no duels
  const user3CompletedDuels = await withAuth(t, "test-user-3").query(
    api.duels.getPlayerCompletedDuels,
    {}
  );

  expect(user3CompletedDuels).toHaveLength(0);
});

test("should allow unauthenticated users to view duels", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create a wizard
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create a duel as an authenticated user
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Test that unauthenticated users can view the duel
  const duelAsUnauthenticated = await t.query(api.duels.getDuel, {
    duelId,
  });

  expect(duelAsUnauthenticated).not.toBeNull();
  expect(duelAsUnauthenticated?._id).toBe(duelId);
  expect(duelAsUnauthenticated?.wizards).toContain(wizard1Id);

  // Test with different duel statuses
  await t.run(async (ctx) => {
    await ctx.db.patch(duelId, { status: "IN_PROGRESS" });
  });

  const inProgressDuelAsUnauthenticated = await t.query(api.duels.getDuel, {
    duelId,
  });

  expect(inProgressDuelAsUnauthenticated).not.toBeNull();
  expect(inProgressDuelAsUnauthenticated?.status).toBe("IN_PROGRESS");

  // Test with completed status
  await t.run(async (ctx) => {
    await ctx.db.patch(duelId, { status: "COMPLETED" });
  });

  const completedDuelAsUnauthenticated = await t.query(api.duels.getDuel, {
    duelId,
  });

  expect(completedDuelAsUnauthenticated).not.toBeNull();
  expect(completedDuelAsUnauthenticated?.status).toBe("COMPLETED");
});
test("should create duel with image generation disabled", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create a wizard
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create a duel with image generation disabled
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
      enableImageGeneration: false,
    }
  );

  // Verify the duel was created with text-only mode enabled
  const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
    duelId,
  });
  expect(duel).toBeTruthy();
  expect(duel!.textOnlyMode).toBe(true);
  expect(duel!.textOnlyReason).toBe("user_preference");
});

test("should create duel with image generation enabled by default", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create a wizard
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create a duel without specifying image generation preference (should default to enabled)
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Verify the duel was created with text-only mode disabled
  const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
    duelId,
  });
  expect(duel).toBeTruthy();
  expect(duel!.textOnlyMode).toBe(false);
  expect(duel!.textOnlyReason).toBeUndefined();
});

test("should allow undoing a spell while waiting for other wizards", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create two wizards for different users
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  const wizard2Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-2",
      name: "Saruman",
      description: "A powerful wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create duel
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Join duel with second wizard
  await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2Id],
  });

  // Start the duel
  await withAuth(t, "test-user-1").mutation(
    api.duels.startDuelAfterIntroduction,
    {
      duelId,
    }
  );

  // Cast spell with first wizard
  await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
    duelId,
    wizardId: wizard1Id,
    spellDescription: "Fireball!",
  });

  // Verify spell was cast
  let duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
    duelId,
  });
  expect(duel?.needActionsFrom).toEqual([wizard2Id]); // Only wizard2 needs to act

  const currentRound = duel?.rounds?.find(
    (r) => r.roundNumber === duel.currentRound
  );
  expect(currentRound?.spells?.[wizard1Id]?.description).toBe("Fireball!");

  // Undo the spell
  await withAuth(t, "test-user-1").mutation(api.duels.undoSpell, {
    duelId,
    wizardId: wizard1Id,
  });

  // Verify spell was undone
  duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
    duelId,
  });
  expect(duel?.needActionsFrom).toHaveLength(2); // Both wizards need to act again
  expect(duel?.needActionsFrom).toContain(wizard1Id);
  expect(duel?.needActionsFrom).toContain(wizard2Id);

  const updatedRound = duel?.rounds?.find(
    (r) => r.roundNumber === duel.currentRound
  );
  expect(updatedRound?.spells?.[wizard1Id]).toBeUndefined();
});

test("should not allow undoing a spell if wizard hasn't cast one", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create two wizards for different users
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  const wizard2Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-2",
      name: "Saruman",
      description: "A powerful wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create duel
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Join duel with second wizard
  await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2Id],
  });

  // Start the duel
  await withAuth(t, "test-user-1").mutation(
    api.duels.startDuelAfterIntroduction,
    {
      duelId,
    }
  );

  // Try to undo a spell without casting one first
  await expect(
    withAuth(t, "test-user-1").mutation(api.duels.undoSpell, {
      duelId,
      wizardId: wizard1Id,
    })
  ).rejects.toThrow(
    "No spell to undo - wizard has not cast a spell this round"
  );
});

test("should not allow undoing a spell after round processing has started", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.*s"));

  // Create two wizards for different users
  const wizard1Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-1",
      name: "Gandalf",
      description: "A wise wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  const wizard2Id = await t.run(async (ctx) => {
    return await ctx.db.insert("wizards", {
      owner: "test-user-2",
      name: "Saruman",
      description: "A powerful wizard",
      wins: 0,
      losses: 0,
      isAIPowered: false,
    });
  });

  // Create duel
  const duelId = await withAuth(t, "test-user-1").mutation(
    api.duels.createDuel,
    {
      numberOfRounds: 3,
      wizards: [wizard1Id],
    }
  );

  // Join duel with second wizard
  await withAuth(t, "test-user-2").mutation(api.duels.joinDuel, {
    duelId,
    wizards: [wizard2Id],
  });

  // Start the duel
  await withAuth(t, "test-user-1").mutation(
    api.duels.startDuelAfterIntroduction,
    {
      duelId,
    }
  );

  // Cast spells with both wizards (this will trigger processing)
  await withAuth(t, "test-user-1").mutation(api.duels.castSpell, {
    duelId,
    wizardId: wizard1Id,
    spellDescription: "Fireball!",
  });

  await withAuth(t, "test-user-2").mutation(api.duels.castSpell, {
    duelId,
    wizardId: wizard2Id,
    spellDescription: "Ice Shard!",
  });

  // Manually set round status to PROCESSING to simulate what happens when all spells are cast
  const duel = await withAuth(t, "test-user-1").query(api.duels.getDuel, {
    duelId,
  });
  const currentRound = duel?.rounds?.find(
    (r) => r.roundNumber === duel.currentRound
  );

  if (currentRound) {
    await t.run(async (ctx) => {
      await ctx.db.patch(currentRound._id, {
        status: "PROCESSING" as const,
      });
    });
  }

  // Try to undo a spell after processing has started
  await expect(
    withAuth(t, "test-user-1").mutation(api.duels.undoSpell, {
      duelId,
      wizardId: wizard1Id,
    })
  ).rejects.toThrow("Cannot undo spell - round is no longer accepting spells");
});
