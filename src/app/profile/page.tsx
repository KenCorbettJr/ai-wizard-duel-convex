"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import { RuneSpinner } from "@/components/ui/rune-spinner";

/**
 * Profile page that redirects to the user's public profile
 * This provides a convenient /profile route that users can bookmark
 */
export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // Convex must hold the sign-in token first, or the answer is "no profile".
  const { isAuthenticated: convexReady } = useConvexAuth();
  const profileStatus = useQuery(
    api.userProfiles.getCurrentUserProfileStatus,
    isLoaded && isSignedIn && convexReady ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoaded) return;

    // Redirect to sign-in if not authenticated
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    // Redirect to profile setup if no profile exists
    if (profileStatus && !profileStatus.hasProfile) {
      router.push("/profile/setup");
      return;
    }

    // Redirect to public profile page if profile exists
    if (profileStatus && profileStatus.hasProfile && profileStatus.userId) {
      router.push(`/users/${profileStatus.userId}`);
      return;
    }
  }, [isLoaded, isSignedIn, profileStatus, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <RuneSpinner size="md" label="Loading your profile…" />
      </div>
    </div>
  );
}
