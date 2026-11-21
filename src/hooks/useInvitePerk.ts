import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Invite links are a thank-you for players who have bought tokens, and are
 * hidden from everyone else.
 */
export function useInvitePerk(): boolean {
  const { isSignedIn } = useAuth();
  return !!useQuery(api.referrals.hasInvitePerk, isSignedIn ? {} : "skip");
}
