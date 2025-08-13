"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateDuelForm } from "@/components/CreateDuelForm";
import { DuelCreatedSuccess } from "@/components/DuelCreatedSuccess";
import { Id } from "../../../../convex/_generated/dataModel";

function CreateDuelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createdDuelId, setCreatedDuelId] = useState<Id<"duels"> | null>(null);

  const preSelectedWizardId = searchParams.get(
    "wizardId"
  ) as Id<"wizards"> | null;

  const handleSuccess = (duelId: Id<"duels">) => {
    // Instead of showing success page, redirect directly to join page
    router.push(`/duels/${duelId}`);
  };

  const handleClose = () => {
    router.push("/dashboard");
  };

  const handleViewDuel = () => {
    if (createdDuelId) {
      router.push(`/duels/${createdDuelId}`);
    }
  };

  const handleCreateAnother = () => {
    setCreatedDuelId(null);
  };

  return (
    <main className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {createdDuelId ? "Duel Created!" : "Create a New Duel"}
          </h2>
          <p className="text-muted-foreground">
            {createdDuelId
              ? "Share your duel with friends to start the battle"
              : "Set up a magical battle and challenge other wizards"}
          </p>
        </div>

        {createdDuelId ? (
          <DuelCreatedSuccess
            duelId={createdDuelId}
            onViewDuel={handleViewDuel}
            onCreateAnother={handleCreateAnother}
          />
        ) : (
          <CreateDuelForm
            onClose={handleClose}
            onSuccess={handleSuccess}
            preSelectedWizardId={preSelectedWizardId || undefined}
          />
        )}
      </div>
    </main>
  );
}

export default function CreateDuelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <Suspense
        fallback={
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/2 mx-auto mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-8"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        }
      >
        <CreateDuelContent />
      </Suspense>
    </div>
  );
}
