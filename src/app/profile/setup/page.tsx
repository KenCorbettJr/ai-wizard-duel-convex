"use client";

import { isSafeRedirectPath } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ProfileSetupForm } from "../../../components/ProfileSetupForm";
import { useEffect } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  const handleProfileComplete = () => {
    // Check for redirect URL in query params
    const urlParams = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : "",
    );
    const redirectUrl = urlParams.get("redirect_url");

    // Same-site paths only, so the link can't send anyone elsewhere
    if (isSafeRedirectPath(redirectUrl)) {
      router.push(redirectUrl);
    } else {
      // Redirect to dashboard after successful profile creation
      router.push("/");
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RuneSpinner size="md" label="Loading…" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to sign-in
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide mb-2">
            Welcome to AI Wizard Duel!
          </h1>
          <p className="text-lg text-foreground mb-6">
            Let&apos;s set up your wizard profile to get started
          </p>
          <div className="bg-info/10 border border-info/40 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-info mb-2">
              Why create a user ID?
            </h2>
            <ul className="text-sm text-info space-y-1 text-left">
              <li>
                • Get a unique identifier like @
                {user.firstName?.toLowerCase() || "wizard"}
              </li>
              <li>• Have a public profile to showcase your wizards</li>
              <li>• Let others discover and challenge your creations</li>
              <li>• Build your reputation in the wizard community</li>
            </ul>
          </div>
        </div>

        <ProfileSetupForm
          onComplete={handleProfileComplete}
          initialName={user.fullName || undefined}
        />

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Your user ID will be permanent and cannot be changed later
          </p>
        </div>
      </div>
    </div>
  );
}
