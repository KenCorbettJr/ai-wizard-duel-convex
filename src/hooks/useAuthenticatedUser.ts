import { useConvexAuth } from "convex/react";
import { useUser } from "@clerk/nextjs";

/**
 * Custom hook to get authenticated user information
 * Combines Convex authentication state with Clerk user data
 */
export function useAuthenticatedUser() {
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const { user, isLoaded: clerkLoaded } = useUser();

  const isLoading = convexLoading || !clerkLoaded;
  const isFullyAuthenticated = isAuthenticated && !!user;

  return {
    isAuthenticated: isFullyAuthenticated,
    isLoading,
    user,
    userId: user?.id,
  };
}
