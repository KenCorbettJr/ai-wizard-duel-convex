"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../../convex/_generated/api";

/**
 * Component that automatically creates user records in Convex database
 * when users authenticate through Clerk for the first time, and ensures
 * users complete their profile setup before accessing the main app
 */
export function UserInitializer() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const profileStatus = useQuery(
    api.userProfiles.getCurrentUserProfileStatus,
    isLoaded && user ? {} : "skip"
  );

  useEffect(() => {
    if (isLoaded && user) {
      getOrCreateUser({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: user.fullName || user.firstName || undefined,
      }).catch((error) => {
        console.error("Failed to create/update user record:", error);
      });
    }
  }, [isLoaded, user, getOrCreateUser]);

  useEffect(() => {
    // Only check profile status after user is loaded and we have profile data
    if (isLoaded && user && profileStatus !== undefined) {
      const isOnProfileSetup = pathname === "/profile/setup";
      const isOnAuthPage =
        pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
      const isOnJoinPage = pathname.startsWith("/join/");

      // If user doesn't have a profile and isn't already on setup page or auth pages
      if (!profileStatus.hasProfile && !isOnProfileSetup && !isOnAuthPage) {
        // Preserve the current path for join pages
        if (isOnJoinPage) {
          router.push(
            `/profile/setup?redirect_url=${encodeURIComponent(pathname)}`
          );
        } else {
          router.push("/profile/setup");
        }
      }

      // If user has a profile but is on setup page, redirect appropriately
      if (profileStatus.hasProfile && isOnProfileSetup) {
        // Check for redirect URL in query params
        const urlParams = new URLSearchParams(
          typeof window !== "undefined" ? window.location.search : ""
        );
        const redirectUrl = urlParams.get("redirect_url");
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push("/");
        }
      }
    }
  }, [isLoaded, user, profileStatus, pathname, router]);

  // This component doesn't render anything
  return null;
}
