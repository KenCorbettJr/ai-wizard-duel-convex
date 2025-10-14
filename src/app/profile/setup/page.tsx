"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ProfileSetupForm } from "../../../components/ProfileSetupForm";
import { useEffect } from "react";

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
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get("redirect_url");

    if (redirectUrl) {
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to sign-in
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to AI Wizard Duel!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Let&apos;s set up your wizard profile to get started
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Why create a user ID?
            </h2>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 text-left">
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your user ID will be permanent and cannot be changed later
          </p>
        </div>
      </div>
    </div>
  );
}
