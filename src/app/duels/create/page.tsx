"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateDuelForm } from "@/components/CreateDuelForm";
import { Id } from "../../../../convex/_generated/dataModel";
import { safeConvexId } from "../../../lib/utils";
import { Swords } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

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

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title={opponentWizardId ? "Challenge a Wizard" : "Create a New Duel"}
          description={
            opponentWizardId
              ? "Send a duel challenge they can accept or decline"
              : "Set up a magical battle and challenge other wizards"
          }
          icon={<Swords className="h-6 w-6" aria-hidden="true" />}
        />

        <CreateDuelForm
          onClose={handleClose}
          onSuccess={handleSuccess}
          preSelectedWizardId={preSelectedWizardId || undefined}
          opponentWizardId={opponentWizardId || undefined}
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
