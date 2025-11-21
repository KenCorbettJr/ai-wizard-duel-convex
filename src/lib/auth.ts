import { User } from "@clerk/nextjs/server";

export type UserRole = "user" | "admin" | "super_admin";

export type WaitlistStatus = "approved" | "pending" | "none";

/**
 * Extended Clerk public metadata interface
 */
export interface ClerkPublicMetadata {
  role?: UserRole;
  waitlistApproved?: boolean;
  waitlistJoinedAt?: number;
  waitlistApprovedAt?: number;
}

/**
 * Check if a user has super admin privileges
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Allow super admin access in development mode
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return user.publicMetadata?.role === "super_admin";
}

/**
 * Check if a user has admin privileges (admin or super_admin)
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Allow admin access in development mode
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const role = user.publicMetadata?.role as UserRole;
  return role === "admin" || role === "super_admin";
}

/**
 * Get the user's role
 */
export function getUserRole(user: User | null | undefined): UserRole {
  if (!user) return "user";

  return (user.publicMetadata?.role as UserRole) || "user";
}

/**
 * Check if a user is approved on the waitlist
 */
export function isWaitlistApproved(user: User | null | undefined): boolean {
  if (!user) return false;

  // Bypass waitlist in development mode if configured
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true"
  ) {
    return true;
  }

  const metadata = (user.publicMetadata as ClerkPublicMetadata) || {};

  // Admins and super admins are automatically approved
  if (metadata.role === "admin" || metadata.role === "super_admin") {
    return true;
  }

  // Check waitlist approval status
  return metadata.waitlistApproved === true;
}

/**
 * Check if a user is pending on the waitlist
 */
export function isWaitlistPending(user: User | null | undefined): boolean {
  if (!user) return false;

  // Bypass waitlist in development mode if configured
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true"
  ) {
    return false;
  }

  const metadata = (user.publicMetadata as ClerkPublicMetadata) || {};

  // Admins and super admins are never pending
  if (metadata.role === "admin" || metadata.role === "super_admin") {
    return false;
  }

  // User is pending if they're authenticated but not approved
  return metadata.waitlistApproved !== true;
}

/**
 * Get waitlist status for a user
 */
export function getWaitlistStatus(
  user: User | null | undefined
): WaitlistStatus {
  if (!user) return "none";

  // Bypass waitlist in development mode if configured
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true"
  ) {
    return "approved";
  }

  const metadata = (user.publicMetadata as ClerkPublicMetadata) || {};

  // Admins and super admins are automatically approved
  if (metadata.role === "admin" || metadata.role === "super_admin") {
    return "approved";
  }

  // Check waitlist approval status
  if (metadata.waitlistApproved === true) {
    return "approved";
  }

  return "pending";
}
