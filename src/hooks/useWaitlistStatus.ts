"use client";

import { useUser } from "@clerk/nextjs";
import type { WaitlistStatus as WaitlistStatusType } from "@/lib/auth";

/**
 * Waitlist status information
 */
export interface WaitlistStatus {
  isApproved: boolean;
  isPending: boolean;
  isLoading: boolean;
  status: WaitlistStatusType;
  user: ReturnType<typeof useUser>["user"];
}

/**
 * Custom hook to get waitlist status information
 * Uses Clerk's useUser() hook internally to check waitlist approval status
 */
export function useWaitlistStatus(): WaitlistStatus {
  const { user, isLoaded } = useUser();

  const isLoading = !isLoaded;

  // Check waitlist approval status
  // We need to handle the client-side UserResource type
  const metadata = user?.publicMetadata as
    | { waitlistApproved?: boolean; role?: string }
    | undefined;

  // Bypass waitlist in development mode if configured
  const isDevelopmentBypass =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true";

  // Admins and super admins are automatically approved
  const isAdminOrSuperAdmin =
    metadata?.role === "admin" || metadata?.role === "super_admin";

  const approved =
    !!user &&
    (isDevelopmentBypass ||
      isAdminOrSuperAdmin ||
      metadata?.waitlistApproved === true);

  const pending =
    !!user &&
    !isDevelopmentBypass &&
    !isAdminOrSuperAdmin &&
    metadata?.waitlistApproved !== true;

  const status: WaitlistStatusType = !user
    ? "none"
    : approved
      ? "approved"
      : "pending";

  return {
    isApproved: approved,
    isPending: pending,
    isLoading,
    status,
    user,
  };
}
