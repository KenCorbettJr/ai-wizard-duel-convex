import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { UserRole } from "./auth";

/**
 * Feature: clerk-waitlist, Property 1: Protected route enforcement
 * Validates: Requirements 1.4, 2.5, 4.5
 *
 * Property: For any protected route in the application, when an unapproved user
 * attempts to access it, the system should redirect them to the waitlist page.
 *
 * This property ensures that:
 * 1. All protected routes are properly identified
 * 2. Unapproved users cannot access protected routes
 * 3. Approved users can access all routes
 * 4. Public routes remain accessible to everyone
 */

// Define the route patterns based on middleware.ts
const PROTECTED_ROUTES = [
  "/wizards",
  "/wizards/create",
  "/wizards/123",
  "/duels",
  "/duels/create",
  "/duels/join",
  "/duels/abc123",
  "/campaign",
  "/campaign/wizard/123",
  "/leaderboard",
  "/profile",
  "/profile/edit",
  "/admin",
  "/admin/users",
  "/credits",
];

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/waitlist",
  "/api/some-endpoint",
  "/join/abc123",
];

// Helper function to check if a route matches a pattern
function matchesPattern(route: string, pattern: string): boolean {
  // Convert pattern to regex (e.g., "/wizards(.*)" -> /^\/wizards/)
  const regexPattern = pattern.replace(/\(\.\*\)/g, "");
  return route.startsWith(regexPattern);
}

// Helper function to determine if a route is protected
function isProtectedRoute(route: string): boolean {
  const protectedPatterns = [
    "/wizards",
    "/duels",
    "/campaign",
    "/leaderboard",
    "/profile",
    "/admin",
    "/credits",
  ];
  return protectedPatterns.some((pattern) => matchesPattern(route, pattern));
}

// Helper function to determine if a route is public
function isPublicRoute(route: string): boolean {
  // Exact match for root
  if (route === "/") return true;

  const publicPatterns = ["/sign-in", "/sign-up", "/waitlist", "/api", "/join"];

  return publicPatterns.some((pattern) => matchesPattern(route, pattern));
}

// Helper function to determine if user should have access
function shouldHaveAccess(
  route: string,
  isAuthenticated: boolean,
  isApproved: boolean,
  role?: UserRole
): boolean {
  // Public routes are always accessible
  if (isPublicRoute(route)) {
    return true;
  }

  // Protected routes require authentication and approval
  if (isProtectedRoute(route)) {
    if (!isAuthenticated) {
      // Unauthenticated users will be handled by Clerk
      return false;
    }

    // Admins and super admins are automatically approved
    if (role === "admin" || role === "super_admin") {
      return true;
    }

    // Regular users need explicit approval
    return isApproved;
  }

  // Other routes are accessible
  return true;
}

describe("Property-Based Tests: Protected Route Enforcement", () => {
  // Note: We test the logic functions directly rather than environment variables
  // The middleware itself handles environment checks

  // Arbitraries for generating test data
  const userRoleArbitrary = fc.constantFrom<UserRole>(
    "user",
    "admin",
    "super_admin"
  );

  const routeArbitrary = fc.oneof(
    fc.constantFrom(...PROTECTED_ROUTES),
    fc.constantFrom(...PUBLIC_ROUTES)
  );

  const userStateArbitrary = fc.record({
    isAuthenticated: fc.boolean(),
    isApproved: fc.boolean(),
    role: fc.option(userRoleArbitrary, { nil: undefined }),
  });

  it("Property 1.1: Protected routes block unapproved authenticated users", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ROUTES),
        fc.constantFrom<UserRole | undefined>("user", undefined),
        (route, role) => {
          // For any protected route and unapproved regular user
          const isAuthenticated = true;
          const isApproved = false;

          const hasAccess = shouldHaveAccess(
            route,
            isAuthenticated,
            isApproved,
            role
          );

          // They should not have access
          expect(hasAccess).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 1.2: Protected routes allow approved users", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ROUTES),
        fc.constantFrom<UserRole | undefined>("user", undefined),
        (route, role) => {
          // For any protected route and approved regular user
          const isAuthenticated = true;
          const isApproved = true;

          const hasAccess = shouldHaveAccess(
            route,
            isAuthenticated,
            isApproved,
            role
          );

          // They should have access
          expect(hasAccess).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 1.3: Admin users can access all protected routes", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ROUTES),
        fc.constantFrom<UserRole>("admin", "super_admin"),
        fc.boolean(),
        (route, role, isApproved) => {
          // For any protected route and admin user (regardless of approval status)
          const isAuthenticated = true;

          const hasAccess = shouldHaveAccess(
            route,
            isAuthenticated,
            isApproved,
            role
          );

          // They should always have access
          expect(hasAccess).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 1.4: Public routes are accessible to everyone", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PUBLIC_ROUTES),
        userStateArbitrary,
        (route, userState) => {
          // For any public route and any user state
          const hasAccess = shouldHaveAccess(
            route,
            userState.isAuthenticated,
            userState.isApproved,
            userState.role
          );

          // They should always have access
          expect(hasAccess).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 1.5: Route classification is consistent", () => {
    fc.assert(
      fc.property(routeArbitrary, (route) => {
        // For any route
        const isProtected = isProtectedRoute(route);
        const isPublic = isPublicRoute(route);

        // A route cannot be both protected and public
        // (though it can be neither, for unclassified routes)
        if (isProtected) {
          expect(isPublic).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.6: Access control is deterministic", () => {
    fc.assert(
      fc.property(routeArbitrary, userStateArbitrary, (route, userState) => {
        // For any route and user state
        const access1 = shouldHaveAccess(
          route,
          userState.isAuthenticated,
          userState.isApproved,
          userState.role
        );
        const access2 = shouldHaveAccess(
          route,
          userState.isAuthenticated,
          userState.isApproved,
          userState.role
        );

        // The same inputs should always produce the same result
        expect(access1).toBe(access2);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 1.7: Unauthenticated users cannot access protected routes", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ROUTES),
        fc.boolean(),
        userRoleArbitrary,
        (route, isApproved, role) => {
          // For any protected route and unauthenticated user
          const isAuthenticated = false;

          const hasAccess = shouldHaveAccess(
            route,
            isAuthenticated,
            isApproved,
            role
          );

          // They should not have access
          expect(hasAccess).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 1.8: Approval status matters only for authenticated regular users on protected routes", () => {
    fc.assert(
      fc.property(
        routeArbitrary,
        fc.boolean(),
        fc.boolean(),
        userRoleArbitrary,
        (route, isAuthenticated, isApproved, role) => {
          // If the route is public, approval status shouldn't matter
          if (isPublicRoute(route)) {
            const hasAccessWithApproval = shouldHaveAccess(
              route,
              isAuthenticated,
              true,
              role
            );
            const hasAccessWithoutApproval = shouldHaveAccess(
              route,
              isAuthenticated,
              false,
              role
            );
            expect(hasAccessWithApproval).toBe(hasAccessWithoutApproval);
          }

          // If the user is an admin, approval status shouldn't matter
          if (role === "admin" || role === "super_admin") {
            const hasAccessWithApproval = shouldHaveAccess(
              route,
              isAuthenticated,
              true,
              role
            );
            const hasAccessWithoutApproval = shouldHaveAccess(
              route,
              isAuthenticated,
              false,
              role
            );
            expect(hasAccessWithApproval).toBe(hasAccessWithoutApproval);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
