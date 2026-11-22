"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/** Lets a duelist give up a duel in progress, after confirming. */
export function ForfeitDuelButton({
  duelId,
  opponentName,
  isCampaignBattle,
}: {
  duelId: Id<"duels">;
  opponentName?: string;
  isCampaignBattle?: boolean;
}) {
  const forfeit = useMutation(api.duels.forfeitDuel);
  const [busy, setBusy] = useState(false);
  const rival = opponentName ?? "Your opponent";

  const handleForfeit = async () => {
    setBusy(true);
    try {
      await forfeit({ duelId });
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String(error.data)
          : "Couldn't forfeit the duel. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-center">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={busy}
          >
            <Flag className="h-4 w-4" aria-hidden="true" />
            Forfeit duel
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forfeit this duel?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCampaignBattle
                ? `${rival} wins this battle. You can challenge them again later.`
                : `${rival} wins, and the loss goes on your wizard's record. This can't be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep fighting</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForfeit}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Forfeit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
