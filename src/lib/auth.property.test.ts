import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  isWaitlistApproved,
  isWaitlistPending,
  getWaitlistStatus,
  type ClerkPublicMetadata,
  type UserRole,
} from "./auth";
import type { User } from "@clerk/nextjs/server";

/**
 * Feature: clerk-waitlist, Property 2: Permission verification completeness
 * Validates: Requirements 2.1, 4.3
 *
 * Property: For any permission check in the system, the check should verify
 * both authentication status and waitlist approval status before granting access.
 *
 * This property ensures that:
 * 1. Unauthenticated users (null/undefined) are never approved
 * 2. Authenticated users must have explicit approval (or admin role) to be approved
 * 3. The functions consistently check both conditions
 */
describe("Property-Based Tests: Permission Verification Completeness", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalWaitlistEnabled = process.env.NEXT_PUBLIC_WAITLIST_ENABLED;

  beforeEach(() => {
    // Set to production mode to ensure waitlist is enforced
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "true";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = originalWaitlistEnabled;
  });

  // Arbitraries for generating test data
  const userRoleArbitrary = fc.constantFrom<UserRole>(
    "user",
    "admin",
    "super_admin"
  );

  const waitlistApprovedArbitrary = fc.option(fc.boolean(), { nil: undefined });

  const metadataArbitrary = fc.record({
    role: fc.option(userRoleArbitrary, { nil: undefined }),
    waitlistApproved: waitlistApprovedArbitrary,
    waitlistJoinedAt: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
    waitlistApprovedAt: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
  });

  const authenticatedUserArbitrary = metadataArbitrary.map(
    (metadata): User =>
      ({
        id: `user_${Math.random().toString(36).substring(7)}`,
        publicMetadata: metadata,
      }) as User
  );

  const userArbitrary = fc.oneof(
    fc.constant(null),
    fc.constant(undefined),
    authenticatedUserArbitrary
  );

  it("Property 2.1: Unauthenticated users are never approved", () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined), (user) => {
        // For any null or undefined user
        const approved = isWaitlistApproved(user);
        const pending = isWaitlistPending(user);
        const status = getWaitlistStatus(user);

        // They should never be approved
        expect(approved).toBe(false);
        // They should not be pending (they're not authenticated)
        expect(pending).toBe(false);
        // Their status should be "none"
        expect(status).toBe("none");
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2.2: Admin users are always approved regardless of waitlist metadata", () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constantFrom<UserRole>("admin", "super_admin"),
          waitlistApproved: fc.option(fc.boolean(), { nil: undefined }),
        }),
        (metadata) => {
          const user: User = {
            id: "user_test",
            publicMetadata: metadata,
          } as User;

          // For any admin or super_admin user
          const approved = isWaitlistApproved(user);
          const pending = isWaitlistPending(user);
          const status = getWaitlistStatus(user);

          // They should always be approved
          expect(approved).toBe(true);
          // They should never be pending
          expect(pending).toBe(false);
          // Their status should be "approved"
          expect(status).toBe("approved");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 2.3: Regular users require explicit approval", () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.constantFrom<UserRole | undefined>("user", undefined),
          waitlistApproved: fc.boolean(),
        }),
        (metadata) => {
          const user: User = {
            id: "user_test",
            publicMetadata: metadata,
          } as User;

          // For any regular user (non-admin)
          const approved = isWaitlistApproved(user);
          const pending = isWaitlistPending(user);
          const status = getWaitlistStatus(user);

          // Their approval should match their waitlistApproved flag
          expect(approved).toBe(metadata.waitlistApproved === true);
          // They should be pending if not approved
          expect(pending).toBe(metadata.waitlistApproved !== true);
          // Their status should match their approval state
          expect(status).toBe(
            metadata.waitlistApproved === true ? "approved" : "pending"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 2.4: Approval and pending states are mutually exclusive", () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        // For any user (including null/undefined)
        const approved = isWaitlistApproved(user);
        const pending = isWaitlistPending(user);

        // A user cannot be both approved and pending
        expect(approved && pending).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2.5: Status consistency with approval functions", () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        // For any user
        const approved = isWaitlistApproved(user);
        const pending = isWaitlistPending(user);
        const status = getWaitlistStatus(user);

        // Status should be consistent with approval functions
        if (approved) {
          expect(status).toBe("approved");
          expect(pending).toBe(false);
        } else if (pending) {
          expect(status).toBe("pending");
          expect(approved).toBe(false);
        } else {
          // Neither approved nor pending means unauthenticated
          expect(status).toBe("none");
          expect(user).toBeOneOf([null, undefined]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2.6: Permission checks verify both authentication and approval", () => {
    fc.assert(
      fc.property(userArbitrary, (user) => {
        // For any user
        const approved = isWaitlistApproved(user);

        if (approved) {
          // If approved, user must be authenticated (not null/undefined)
          expect(user).not.toBe(null);
          expect(user).not.toBe(undefined);

          // And either have explicit approval or be an admin
          if (user) {
            const metadata = (user.publicMetadata as ClerkPublicMetadata) || {};
            const isAdmin =
              metadata.role === "admin" || metadata.role === "super_admin";
            const hasApproval = metadata.waitlistApproved === true;

            expect(isAdmin || hasApproval).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 2.7: Missing metadata is handled safely", () => {
    fc.assert(
      fc.property(
        fc.record({
          hasMetadata: fc.boolean(),
          metadata: metadataArbitrary,
        }),
        ({ hasMetadata, metadata }) => {
          const user: User = {
            id: "user_test",
            publicMetadata: hasMetadata ? metadata : (null as any),
          } as User;

          // For any user with potentially missing metadata
          // Functions should not throw errors
          expect(() => isWaitlistApproved(user)).not.toThrow();
          expect(() => isWaitlistPending(user)).not.toThrow();
          expect(() => getWaitlistStatus(user)).not.toThrow();

          // And should return valid values
          const approved = isWaitlistApproved(user);
          const pending = isWaitlistPending(user);
          const status = getWaitlistStatus(user);

          expect(typeof approved).toBe("boolean");
          expect(typeof pending).toBe("boolean");
          expect(["approved", "pending", "none"]).toContain(status);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Custom matcher for vitest
expect.extend({
  toBeOneOf(received: any, expected: unknown[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(", ")}`
          : `expected ${received} to be one of ${expected.join(", ")}`,
    };
  },
});
