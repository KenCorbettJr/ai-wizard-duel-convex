"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

/**
 * Component that automatically creates user records in Convex database
 * when users authenticate through Clerk for the first time
 */
export function UserInitializer() {
  const { user, isLoaded } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

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

  // This component doesn't render anything
  return null;
}
