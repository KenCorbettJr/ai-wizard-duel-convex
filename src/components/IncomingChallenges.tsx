"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConvexImage } from "@/components/ConvexImage";

/** Duel challenges other players sent to the signed-in player's wizards. */
export function IncomingChallenges() {
  const router = useRouter();
  const challenges = useQuery(api.duels.getMyIncomingChallenges);
  const accept = useMutation(api.duels.acceptChallenge);
  const decline = useMutation(api.duels.declineChallenge);
  const [busy, setBusy] = useState<Id<"duels"> | null>(null);

  if (!challenges || challenges.length === 0) return null;

  const respond = async (duelId: Id<"duels">, choice: "accept" | "decline") => {
    setBusy(duelId);
    try {
      if (choice === "accept") {
        await accept({ duelId });
        posthog.capture("duel_joined", { entry_point: "challenge_list" });
        router.push(`/duels/${duelId}`);
      } else {
        await decline({ duelId });
        posthog.capture("duel_challenge_declined");
        setBusy(null);
      }
    } catch (error) {
      toast.error(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Something went wrong. Try again.",
      );
      setBusy(null);
    }
  };

  return (
    <section aria-labelledby="incoming-challenges" className="mb-8">
      <h2
        id="incoming-challenges"
        className="mb-4 flex items-center gap-2 font-display text-2xl font-bold text-foreground"
      >
        <Swords className="h-5 w-5 text-primary" aria-hidden="true" />
        You&apos;ve been challenged!
      </h2>
      <div className="space-y-3">
        {challenges.map((c) => (
          <Card key={c.duelId} className="border-primary/40">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {c.challenger.illustration ? (
                  <ConvexImage
                    storageId={c.challenger.illustration}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 shrink-0 rounded-full object-cover object-top"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Swords
                      className="h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-foreground">
                    <Link
                      href={`/wizards/${c.challenger._id}`}
                      className="font-semibold hover:underline"
                    >
                      {c.challenger.name}
                    </Link>{" "}
                    challenges{" "}
                    <span className="font-semibold">{c.myWizard.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.numberOfRounds === "TO_THE_DEATH"
                      ? "To the death"
                      : `${c.numberOfRounds} rounds`}
                    {c.creatorCoversEntry ? " · Free for you" : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => respond(c.duelId, "accept")}
                  disabled={busy !== null}
                  className="flex-1 sm:flex-none"
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  onClick={() => respond(c.duelId, "decline")}
                  disabled={busy !== null}
                  className="flex-1 sm:flex-none"
                >
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
