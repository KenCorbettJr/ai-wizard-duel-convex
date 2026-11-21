"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { WizardForm } from "@/components/WizardForm";
import { useState, useEffect } from "react";
import { ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";
import {
  clearPendingWizard,
  peekPendingWizard,
} from "@/lib/pendingWizard";

export default function CreateWizardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const wizards = useQuery(api.wizards.getUserWizards, user ? {} : "skip");
  const isFirstWizard = wizards !== undefined && wizards.length === 0;

  // A description written on the homepage before signing up.
  const [pendingDescription] = useState(() =>
    typeof window === "undefined" ? null : peekPendingWizard(),
  );
  useEffect(() => {
    if (pendingDescription) clearPendingWizard();
  }, [pendingDescription]);

  // No profile gate here: creating a wizard doesn't need a username, and a
  // brand-new player's first step should be their wizard, not a form.

  const handleClose = () => {
    router.push("/wizards");
  };

  // Go to the new wizard's page to watch their portrait being painted.
  const handleSuccess = (wizardId?: string) => {
    router.push(wizardId ? `/wizards/${wizardId}` : "/wizards");
  };

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!user && isLoaded) {
      router.push("/sign-in?redirect_url=/wizards/create");
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
          {!isFirstWizard && (
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
          )}

          <PageHeader
            title={isFirstWizard ? "Create Your First Wizard" : "Create New Wizard"}
            description={
              isFirstWizard
                ? "Describe them however you like. The AI paints their portrait, and they fight as your champion in every duel."
                : "Design your magical champion for epic duels"
            }
            icon={<Wand2 className="h-6 w-6" aria-hidden="true" />}
          />
        </div>

        <div className="max-w-2xl mx-auto">
          {pendingDescription && (
            <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
              We saved your description from the homepage. Give your wizard a
              name, then create them to see their portrait.
            </p>
          )}
          <WizardForm
            mode="create"
            initialData={
              pendingDescription
                ? { name: "", description: pendingDescription }
                : undefined
            }
            onClose={handleClose}
            onSuccess={handleSuccess}
            inModal={false}
          />
        </div>
      </div>
    </div>
  );
}
