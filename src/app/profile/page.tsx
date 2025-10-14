"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";

/**
 * Profile page that redirects to the user's public profile
 * This provides a convenient /profile route that users can bookmark
 */
export default function ProfilePage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const profileStatus = useQuery(
    api.userProfiles.getCurrentUserProfileStatus,
    isLoaded && isSignedIn ? {} : "skip"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Loading your profile...</p>
      </div>
    </div>
  );
}
