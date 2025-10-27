"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { WizardForm } from "@/components/WizardForm";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateWizardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { isProfileComplete, getProfileCompletionPrompt } =
    useProfileCompletion();

  // Check profile completion when user loads
  useEffect(() => {
    if (user && !isProfileComplete) {
      // Use a timeout to avoid the setState in effect warning
      const timer = setTimeout(() => setShowProfilePrompt(true), 0);
      return () => clearTimeout(timer);
    }
  }, [user, isProfileComplete]);

  const handleClose = () => {
    router.push("/wizards");
  };

  const handleSuccess = () => {
    router.push("/wizards");
  };

  const profilePrompt = getProfileCompletionPrompt("create wizards");

  // Redirect to sign-in if not authenticated
  if (!user) {
    router.push("/sign-in?redirect=/wizards/create");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/wizards">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to My Wizards
              </Button>
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Create New Wizard</h1>
            <p className="text-muted-foreground text-lg">
              Design your magical champion for epic duels
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          <WizardForm
            mode="create"
            onClose={handleClose}
            onSuccess={handleSuccess}
            inModal={false}
          />
        </div>

        <ProfileCompletionPrompt
          open={showProfilePrompt}
          onOpenChange={setShowProfilePrompt}
          title={profilePrompt.title}
          message={profilePrompt.message}
          actionLabel={profilePrompt.actionLabel}
          onAction={profilePrompt.onAction}
          isSignInPrompt={false}
        />
      </div>
    </div>
  );
}
