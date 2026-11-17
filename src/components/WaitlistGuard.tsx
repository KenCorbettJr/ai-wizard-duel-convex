"use client";

import { useWaitlistStatus } from "@/hooks/useWaitlistStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export interface WaitlistGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * WaitlistGuard component that protects content based on waitlist approval status
 *
 * Renders children for approved users, fallback for pending users, and loading state
 * while checking status.
 *
 * @param children - Content to render for approved users
 * @param fallback - Optional custom fallback for pending users (defaults to waitlist message)
 */
export function WaitlistGuard({ children, fallback }: WaitlistGuardProps) {
  const { isApproved, isPending, isLoading } = useWaitlistStatus();

  // Show loading state while checking waitlist status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show fallback for pending users
  if (isPending) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    // Default fallback message
    return (
      <Alert className="border-warning bg-warning/10">
        <Clock className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          <strong>Waitlist Approval Required</strong>
          <p className="mt-2">
            This feature requires waitlist approval. Please check your{" "}
            <Link href="/waitlist" className="underline font-semibold">
              waitlist status
            </Link>{" "}
            for more information.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Render children for approved users (or unauthenticated users - they'll be handled by auth)
  if (isApproved) {
    return <>{children}</>;
  }

  // Fallback for unauthenticated users (show default message)
  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return (
    <Alert className="border-warning bg-warning/10">
      <Clock className="h-4 w-4 text-warning" />
      <AlertDescription className="text-warning">
        <strong>Authentication Required</strong>
        <p className="mt-2">Please sign in to access this feature.</p>
      </AlertDescription>
    </Alert>
  );
}
