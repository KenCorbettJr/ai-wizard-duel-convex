"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import posthog from "posthog-js";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { DuelInvitePanel } from "@/components/DuelInvitePanel";

type Duel = Doc<"duels">;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : fallback;
}

/** Shown to the duel's creator while it waits for an opponent. */
export function CreatorWaitingPanel({
  duel,
  creatorWizardName,
}: {
  duel: Duel;
  creatorWizardName?: string;
}) {
  const router = useRouter();
  const cancelDuel = useMutation(api.duels.cancelDuel);
  const [cancelling, setCancelling] = useState(false);
  const challenged = useQuery(
    api.wizards.getWizard,
    duel.challengedWizardId ? { wizardId: duel.challengedWizardId } : "skip",
  );

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelDuel({ duelId: duel._id });
      router.push("/duels");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't cancel the duel. Try again."));
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      {duel.challengedUserId ? (
        <p className="text-muted-foreground">
          Your challenge was sent to{" "}
          <span className="font-medium text-foreground">
            {challenged?.name ?? "your opponent"}
          </span>
          . The duel starts as soon as they accept, and you&apos;ll get a
          notification.
        </p>
      ) : (
        duel.shortcode && (
          <DuelInvitePanel
            shortcode={duel.shortcode}
            wizardName={creatorWizardName}
          />
        )
      )}
      <div className="flex justify-center sm:justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={cancelling}
          className="text-muted-foreground"
        >
          {cancelling
            ? "Cancelling…"
            : duel.challengedUserId
              ? "Withdraw challenge"
              : "Cancel duel"}
        </Button>
      </div>
    </div>
  );
}

/** Shown to everyone else on a private challenge that hasn't been answered. */
export function ChallengeResponsePanel({
  duel,
  userId,
  challengerWizardName,
}: {
  duel: Duel;
  userId: string | undefined;
  challengerWizardName?: string;
}) {
  const acceptChallenge = useMutation(api.duels.acceptChallenge);
  const declineChallenge = useMutation(api.duels.declineChallenge);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const challenged = useQuery(
    api.wizards.getWizard,
    duel.challengedWizardId ? { wizardId: duel.challengedWizardId } : "skip",
  );
  const challengedName = challenged?.name ?? "another wizard";

  if (!userId || userId !== duel.challengedUserId) {
    return (
      <p className="text-muted-foreground">
        This is a private challenge for {challengedName}. You can watch once
        it&apos;s accepted.
      </p>
    );
  }

  const respond = async (choice: "accept" | "decline") => {
    setBusy(choice);
    setError(null);
    try {
      if (choice === "accept") {
        await acceptChallenge({ duelId: duel._id });
        posthog.capture("duel_joined", { entry_point: "challenge" });
      } else {
        await declineChallenge({ duelId: duel._id });
        posthog.capture("duel_challenge_declined");
      }
      // The page updates itself once the duel changes.
    } catch (e) {
      setError(
        errorMessage(
          e,
          choice === "accept"
            ? "Couldn't accept the challenge. Try again."
            : "Couldn't decline the challenge. Try again.",
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-foreground">
        <span className="font-semibold">
          {challengerWizardName ?? "A wizard"}
        </span>{" "}
        challenges your wizard{" "}
        <span className="font-semibold">{challengedName}</span>!
      </p>
      <p className="text-sm text-muted-foreground">
        {duel.creatorCoversEntry
          ? "Your challenger is covering your entry, so this duel is free for you."
          : "Accepting uses one duel token, as any duel does."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => respond("accept")}
          disabled={busy !== null}
          className="flex-1"
        >
          {busy === "accept" ? "Accepting…" : "Accept challenge"}
        </Button>
        <Button
          variant="outline"
          onClick={() => respond("decline")}
          disabled={busy !== null}
          className="flex-1"
        >
          {busy === "decline" ? "Declining…" : "Decline"}
        </Button>
      </div>
    </div>
  );
}
