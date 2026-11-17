"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { WizardForm } from "@/components/WizardForm";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useState, useEffect } from "react";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";

export default function CreateWizardPage() {
  const { user, isLoaded } = useUser();
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
  useEffect(() => {
    if (!user && isLoaded) {
      router.push("/sign-in?redirect=/wizards/create");
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RuneSpinner size="md" label="Loading…" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <Link href="/wizards">
                <ArrowLeft className="h-4 w-4" />
                Back to My Wizards
              </Link>
            </Button>
          </div>

          <PageHeader
            title="Create New Wizard"
            description="Design your magical champion for epic duels"
            icon={<Wand2 className="h-6 w-6" aria-hidden="true" />}
          />
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
