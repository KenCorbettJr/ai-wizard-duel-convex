"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ProfileEditForm } from "../../../components/ProfileEditForm";

export default function ProfileEditPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-64 bg-muted rounded-lg w-96"></div>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  const handleSuccess = () => {
    // Navigate back to user's profile page after successful edit
    router.push("/profile");
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide mb-2">
              Edit Your Profile
            </h1>
            <p className="text-muted-foreground">
              Update your display name and other profile information
            </p>
          </div>

          {/* Profile Edit Form */}
          <ProfileEditForm onSuccess={handleSuccess} />

          {/* Navigation */}
          <div className="mt-6 hidden text-center md:block">
            <Button variant="ghost" onClick={() => router.back()}>
              ← Back to Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
