"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateDuelForm, FormSkeleton } from "@/components/CreateDuelForm";
import { Id } from "../../../../convex/_generated/dataModel";
import { safeConvexId } from "../../../lib/utils";

function CreateDuelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const wizardIdParam = searchParams.get("wizardId");
  const preSelectedWizardId = wizardIdParam
    ? safeConvexId<"wizards">(wizardIdParam)
    : null;
  const opponentParam = searchParams.get("opponentWizardId");
  const opponentWizardId = opponentParam
    ? safeConvexId<"wizards">(opponentParam)
    : null;
  // The duel page shows the invite (or the pending challenge) and updates
  // live, so the creator is already in the arena when their opponent joins.
  const handleSuccess = (duelId: Id<"duels">) => {
    router.push(`/duels/${duelId}`);
  };

  // Not router.back(): after a detour (tokens, profile) "back" is that page
  const handleClose = () => {
    router.push("/duels");
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <CreateDuelForm
          onClose={handleClose}
          onSuccess={handleSuccess}
          preSelectedWizardId={preSelectedWizardId || undefined}
          opponentWizardId={opponentWizardId || undefined}
          brokenChallengeLink={!!opponentParam && !opponentWizardId}
        />
      </div>
    </div>
  );
}

export default function CreateDuelPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
            <div className="max-w-2xl mx-auto">
              <FormSkeleton />
            </div>
          </div>
        }
      >
        <CreateDuelContent />
      </Suspense>
    </div>
  );
}
