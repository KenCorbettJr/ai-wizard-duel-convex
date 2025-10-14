"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ProfileEditForm } from "../../../components/ProfileEditForm";

export default function ProfileEditPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-48 mb-4"></div>
          <div className="h-64 bg-white/10 rounded-lg w-96"></div>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Edit Your Profile
            </h1>
            <p className="text-blue-200">
              Update your display name and other profile information
            </p>
          </div>

          {/* Profile Edit Form */}
          <ProfileEditForm onSuccess={handleSuccess} />

          {/* Navigation */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.back()}
              className="text-blue-300 hover:text-white transition-colors"
            >
              ← Back to Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
