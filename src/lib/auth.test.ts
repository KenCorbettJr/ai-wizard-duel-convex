import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isWaitlistApproved,
  isWaitlistPending,
  getWaitlistStatus,
  type ClerkPublicMetadata,
  type WaitlistStatus,
} from "./auth";
import type { User } from "@clerk/nextjs/server";

describe("Waitlist Utility Functions", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED;

  beforeEach(() => {
    // Reset environment to production for consistent testing
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = originalWaitlistEnabled;
  });

  // Helper function to create a mock user
  const createMockUser = (
    metadata: Partial<ClerkPublicMetadata> = {}
  ): User => {
    return {
      id: "user_123",
      publicMetadata: metadata,
    } as User;
  };

  describe("isWaitlistApproved", () => {
    it("should return false for null user", () => {
      expect(isWaitlistApproved(null)).toBe(false);
    });

    it("should return false for undefined user", () => {
      expect(isWaitlistApproved(undefined)).toBe(false);
    });

    it("should return true for user with waitlistApproved: true", () => {
      const user = createMockUser({ waitlistApproved: true });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should return false for user with waitlistApproved: false", () => {
      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistApproved(user)).toBe(false);
    });

    it("should return false for user with missing waitlistApproved", () => {
      const user = createMockUser({});
      expect(isWaitlistApproved(user)).toBe(false);
    });

    it("should return true for admin user regardless of waitlist status", () => {
      const user = createMockUser({ role: "admin", waitlistApproved: false });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should return true for super_admin user regardless of waitlist status", () => {
      const user = createMockUser({
        role: "super_admin",
        waitlistApproved: false,
      });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should return true for admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "admin" });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should return true for super_admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "super_admin" });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should return false for regular user with no metadata", () => {
      const user = createMockUser({ role: "user" });
      expect(isWaitlistApproved(user)).toBe(false);
    });

    it("should bypass waitlist in development mode when not explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "false";

      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistApproved(user)).toBe(true);
    });

    it("should enforce waitlist in development mode when explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";

      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistApproved(user)).toBe(false);
    });
  });

  describe("isWaitlistPending", () => {
    it("should return false for null user", () => {
      expect(isWaitlistPending(null)).toBe(false);
    });

    it("should return false for undefined user", () => {
      expect(isWaitlistPending(undefined)).toBe(false);
    });

    it("should return false for user with waitlistApproved: true", () => {
      const user = createMockUser({ waitlistApproved: true });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should return true for user with waitlistApproved: false", () => {
      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistPending(user)).toBe(true);
    });

    it("should return true for user with missing waitlistApproved", () => {
      const user = createMockUser({});
      expect(isWaitlistPending(user)).toBe(true);
    });

    it("should return false for admin user regardless of waitlist status", () => {
      const user = createMockUser({ role: "admin", waitlistApproved: false });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should return false for super_admin user regardless of waitlist status", () => {
      const user = createMockUser({
        role: "super_admin",
        waitlistApproved: false,
      });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should return false for admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "admin" });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should return false for super_admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "super_admin" });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should return true for regular user with no metadata", () => {
      const user = createMockUser({ role: "user" });
      expect(isWaitlistPending(user)).toBe(true);
    });

    it("should return false in development mode when not explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "false";

      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistPending(user)).toBe(false);
    });

    it("should enforce waitlist in development mode when explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";

      const user = createMockUser({ waitlistApproved: false });
      expect(isWaitlistPending(user)).toBe(true);
    });
  });

  describe("getWaitlistStatus", () => {
    it("should return 'none' for null user", () => {
      expect(getWaitlistStatus(null)).toBe("none");
    });

    it("should return 'none' for undefined user", () => {
      expect(getWaitlistStatus(undefined)).toBe("none");
    });

    it("should return 'approved' for user with waitlistApproved: true", () => {
      const user = createMockUser({ waitlistApproved: true });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should return 'pending' for user with waitlistApproved: false", () => {
      const user = createMockUser({ waitlistApproved: false });
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should return 'pending' for user with missing waitlistApproved", () => {
      const user = createMockUser({});
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should return 'approved' for admin user regardless of waitlist status", () => {
      const user = createMockUser({ role: "admin", waitlistApproved: false });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should return 'approved' for super_admin user regardless of waitlist status", () => {
      const user = createMockUser({
        role: "super_admin",
        waitlistApproved: false,
      });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should return 'approved' for admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "admin" });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should return 'approved' for super_admin user with no waitlist metadata", () => {
      const user = createMockUser({ role: "super_admin" });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should return 'pending' for regular user with no metadata", () => {
      const user = createMockUser({ role: "user" });
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should return 'approved' in development mode when not explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "false";

      const user = createMockUser({ waitlistApproved: false });
      expect(getWaitlistStatus(user)).toBe("approved");
    });

    it("should enforce waitlist in development mode when explicitly enabled", () => {
      process.env.NODE_ENV = "development";
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";

      const user = createMockUser({ waitlistApproved: false });
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should return correct status type", () => {
      const user = createMockUser({ waitlistApproved: true });
      const status: WaitlistStatus = getWaitlistStatus(user);
      expect(["approved", "pending", "none"]).toContain(status);
    });
  });

  describe("Edge Cases", () => {
    it("should handle user with empty publicMetadata object", () => {
      const user = { id: "user_123", publicMetadata: {} } as User;
      expect(isWaitlistApproved(user)).toBe(false);
      expect(isWaitlistPending(user)).toBe(true);
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should handle user with null publicMetadata", () => {
      const user = { id: "user_123", publicMetadata: null } as unknown as User;
      expect(isWaitlistApproved(user)).toBe(false);
      expect(isWaitlistPending(user)).toBe(true);
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should handle user with undefined publicMetadata", () => {
      const user = {
        id: "user_123",
        publicMetadata: undefined,
      } as unknown as User;
      expect(isWaitlistApproved(user)).toBe(false);
      expect(isWaitlistPending(user)).toBe(true);
      expect(getWaitlistStatus(user)).toBe("pending");
    });

    it("should handle user with additional metadata fields", () => {
      const user = createMockUser({
        waitlistApproved: true,
        waitlistJoinedAt: Date.now(),
        waitlistApprovedAt: Date.now(),
        role: "user",
      });
      expect(isWaitlistApproved(user)).toBe(true);
      expect(isWaitlistPending(user)).toBe(false);
      expect(getWaitlistStatus(user)).toBe("approved");
    });
  });
});
