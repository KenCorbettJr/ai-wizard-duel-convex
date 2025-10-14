"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "../../convex/_generated/api";

/**
 * Hook to check if user has completed profile setup and provide
 * utilities for handling profile completion requirements
 */
export function useProfileCompletion() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const profileStatus = useQuery(
    api.userProfiles.getCurrentUserProfileStatus,
    isLoaded && isSignedIn ? {} : "skip"
  );

  const isProfileComplete = profileStatus?.hasProfile ?? false;
  const userId = profileStatus?.userId;
  const displayName = profileStatus?.displayName;

  /**
   * Check if user can perform an action that requires a complete profile.
   * If not, redirect to appropriate page (sign-in or profile setup)
   * @returns true if user can proceed, false if redirected
   */
  const requireProfileCompletion = (): boolean => {
    if (!isLoaded) return false;

    if (!isSignedIn) {
      router.push("/sign-in");
      return false;
    }

    if (profileStatus && !profileStatus.hasProfile) {
      router.push("/profile/setup");
      return false;
    }

    return isProfileComplete;
  };

  /**
   * Show a profile completion prompt for actions that require a complete profile
   * @param action - The action the user is trying to perform
   * @returns object with prompt info and action handler
   */
  const getProfileCompletionPrompt = (
    action: string = "perform this action"
  ) => {
    if (!isLoaded) {
      return {
        shouldShow: false,
        title: "",
        message: "",
        actionLabel: "",
        onAction: () => {},
      };
    }

    if (!isSignedIn) {
      return {
        shouldShow: true,
        title: "Sign In Required",
        message: `You need to sign in to ${action}.`,
        actionLabel: "Sign In",
        onAction: () => router.push("/sign-in"),
      };
    }

    if (profileStatus && !profileStatus.hasProfile) {
      return {
        shouldShow: true,
        title: "Complete Your Profile",
        message: `Please complete your profile setup to ${action}. This helps other players discover and recognize your wizards.`,
        actionLabel: "Complete Profile",
        onAction: () => router.push("/profile/setup"),
      };
    }

    return {
      shouldShow: false,
      title: "",
      message: "",
      actionLabel: "",
      onAction: () => {},
    };
  };

  return {
    isLoaded,
    isSignedIn,
    isProfileComplete,
    userId,
    displayName,
    requireProfileCompletion,
    getProfileCompletionPrompt,
  };
}
