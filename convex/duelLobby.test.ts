import { convexTest } from "convex-test";
import { expect, test, describe, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";
import { withAuth } from "./test_utils";

describe("Duel Lobby", () => {
  let t: ReturnType<typeof convexTest>;
  let userId1: string;
  let userId2: string;
  let wizardId1: Id<"wizards">;
  let wizardId2: Id<"wizards">;

  beforeEach(async () => {
    t = convexTest(schema);

    // Create test users
    userId1 = "user1";
    userId2 = "user2";

    // Create test wizards directly in database
    wizardId1 = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: userId1,
        name: "Test Wizard 1",
        description: "A test wizard for lobby testing",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });

    wizardId2 = await t.run(async (ctx) => {
      return await ctx.db.insert("wizards", {
        owner: userId2,
        name: "Test Wizard 2",
        description: "Another test wizard for lobby testing",
        wins: 0,
        losses: 0,
        isAIPowered: false,
      });
    });
  });

  test("should allow user to join lobby", async () => {
    const lobbyId = await withAuth(t, userId1).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId1,
        duelType: 3,
      },
    );

    expect(lobbyId).toBeDefined();

    const userStatus = await withAuth(t, userId1).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );
    expect(userStatus).toBeTruthy();
    expect(userStatus?.status).toBe("WAITING");
    expect(userStatus?.wizardId).toBe(wizardId1);
    expect(userStatus?.duelType).toBe(3);
  });

  test("should prevent user from joining lobby twice", async () => {
    await withAuth(t, userId1).mutation(api.duelLobby.joinLobby, {
      wizardId: wizardId1,
      duelType: 3,
    });

    await expect(
      withAuth(t, userId1).mutation(api.duelLobby.joinLobby, {
        wizardId: wizardId1,
        duelType: 5,
      }),
    ).rejects.toThrow("Already in lobby");
  });

  test("should allow user to leave lobby", async () => {
    await withAuth(t, userId1).mutation(api.duelLobby.joinLobby, {
      wizardId: wizardId1,
      duelType: 3,
    });

    await withAuth(t, userId1).mutation(api.duelLobby.leaveLobby, {});

    const userStatus = await withAuth(t, userId1).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );
    expect(userStatus).toBeNull();
  });

  test("should match two players with same duel type", async () => {
    // First player joins
    const lobbyId1 = await withAuth(t, userId1).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId1,
        duelType: 3,
      },
    );

    // Second player joins with same duel type
    const lobbyId2 = await withAuth(t, userId2).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId2,
        duelType: 3,
      },
    );

    // Trigger matchmaking manually since scheduler doesn't run in tests
    await t.mutation(internal.duelLobby.tryMatchmaking, { lobbyId: lobbyId1 });

    // Check that both players are matched
    const user1Status = await withAuth(t, userId1).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );
    const user2Status = await withAuth(t, userId2).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );

    expect(user1Status?.status).toBe("MATCHED");
    expect(user2Status?.status).toBe("MATCHED");
    expect(user1Status?.matchedWith).toBe(lobbyId2);
    expect(user2Status?.matchedWith).toBe(lobbyId1);
  });

  test("should not match players with different duel types", async () => {
    // First player joins with 3 rounds
    const lobbyId1 = await withAuth(t, userId1).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId1,
        duelType: 3,
      },
    );

    // Second player joins with 5 rounds
    await withAuth(t, userId2).mutation(api.duelLobby.joinLobby, {
      wizardId: wizardId2,
      duelType: 5,
    });

    // Try matchmaking
    await t.mutation(internal.duelLobby.tryMatchmaking, { lobbyId: lobbyId1 });

    // Check that players are still waiting
    const user1Status = await withAuth(t, userId1).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );
    const user2Status = await withAuth(t, userId2).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );

    expect(user1Status?.status).toBe("WAITING");
    expect(user2Status?.status).toBe("WAITING");
  });

  test("should get lobby statistics", async () => {
    // Add some players to lobby
    await withAuth(t, userId1).mutation(api.duelLobby.joinLobby, {
      wizardId: wizardId1,
      duelType: 3,
    });

    await withAuth(t, userId2).mutation(api.duelLobby.joinLobby, {
      wizardId: wizardId2,
      duelType: 5,
    });

    const stats = await t.query(api.duelLobby.getLobbyStats);

    expect(stats.totalWaiting).toBe(2);
    expect(stats.totalMatched).toBe(0);
    expect(stats.averageWaitTime).toBeGreaterThanOrEqual(0);
  });

  test("should create duel when players are matched", async () => {
    // First player joins
    const lobbyId1 = await withAuth(t, userId1).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId1,
        duelType: 3,
      },
    );

    // Second player joins
    const lobbyId2 = await withAuth(t, userId2).mutation(
      api.duelLobby.joinLobby,
      {
        wizardId: wizardId2,
        duelType: 3,
      },
    );

    // Trigger matchmaking
    await t.mutation(internal.duelLobby.tryMatchmaking, { lobbyId: lobbyId1 });

    // Trigger duel creation
    await t.mutation(internal.duelLobby.createMatchedDuel, {
      lobbyId1,
      lobbyId2,
    });

    // Check that lobby entries were removed (players are no longer in lobby)
    const user1Status = await withAuth(t, userId1).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );
    const user2Status = await withAuth(t, userId2).query(
      api.duelLobby.getUserLobbyStatus,
      {},
    );

    expect(user1Status).toBeNull();
    expect(user2Status).toBeNull();

    // Verify the duel was created by checking all duels
    const allDuels = await t.query(api.duels.getActiveDuels);
    expect(allDuels.length).toBe(1);

    const duel = allDuels[0];
    expect(duel.numberOfRounds).toBe(3);
    expect(duel.wizards).toContain(wizardId1);
    expect(duel.wizards).toContain(wizardId2);
    expect(duel.players).toContain(userId1);
    expect(duel.players).toContain(userId2);
    expect(duel.status).toBe("IN_PROGRESS");

    // Verify that users can get their recent duel for redirect
    const user1RecentDuel = await withAuth(t, userId1).query(
      api.duelLobby.getUserRecentDuel,
      {},
    );
    const user2RecentDuel = await withAuth(t, userId2).query(
      api.duelLobby.getUserRecentDuel,
      {},
    );

    expect(user1RecentDuel).toBe(duel._id);
    expect(user2RecentDuel).toBe(duel._id);
  });
});
