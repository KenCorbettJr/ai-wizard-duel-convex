import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { verifySuperAdmin } from "./auth.utils";
import schema from "./schema";
import { withAuth, withSuperAdminAuth } from "./test_utils";

describe("Auth Utils", () => {
  test("verifySuperAdmin should allow super admin users", async () => {
    const t = convexTest(schema);

    // This should not throw
    await expect(
      withSuperAdminAuth(t).run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).resolves.toBeDefined();
  });

  test("verifySuperAdmin should reject regular users", async () => {
    const t = convexTest(schema);

    // This should throw
    await expect(
      withAuth(t, "regular-user").run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).rejects.toThrow("Access denied: Super admin privileges required");
  });

  test("verifySuperAdmin should reject unauthenticated users", async () => {
    const t = convexTest(schema);

    // This should throw
    await expect(
      t.run(async (ctx) => {
        return await verifySuperAdmin(ctx);
      })
    ).rejects.toThrow("Not authenticated");
  });
});
