"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DuelListItem } from "@/components/DuelListItem";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { Swords, Users, Search } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { IncomingChallenges } from "@/components/IncomingChallenges";

export default function DuelsPage() {
  const { user, isLoaded } = useUser();

  const activeDuels = useQuery(api.duels.getActiveDuels);
  const rawPlayerDuels = useQuery(
    api.duels.getPlayerDuels,
    user?.id ? {} : "skip",
  );
  // Duels still in play first, then the newest finished ones, matching the
  // order everywhere else in the app.
  const playerDuels = rawPlayerDuels
    ? [...rawPlayerDuels].sort((a, b) => {
        const aOpen = a.status !== "COMPLETED" && a.status !== "CANCELLED";
        const bOpen = b.status !== "COMPLETED" && b.status !== "CANCELLED";
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt);
      })
    : rawPlayerDuels;

  return (
    <div className="min-h-screen">
      <div className="@container container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          title="My Duels"
          description="Your battles, and open duels you can jump into."
          icon={<Swords className="h-6 w-6" aria-hidden="true" />}
        />

        {/* Registration prompt for anonymous users, once Clerk knows */}
        {isLoaded && !user && (
          <div className="mb-6">
            <RegistrationPrompt context="duel_access" />
          </div>
        )}

        {user && <IncomingChallenges />}

        {(!isLoaded || user) && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/duels/create">
                <Swords className="h-4 w-4" aria-hidden="true" />
                Start a duel
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/duels/lobby">
                <Users className="h-4 w-4" aria-hidden="true" />
                Quick Match
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/duels/join">
                <Search className="h-4 w-4" aria-hidden="true" />
                Join with a code
              </Link>
            </Button>
          </div>
        )}

        <div className="space-y-10">
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4 font-display">
              Your Duels
            </h3>
            {!isLoaded || (user && playerDuels === undefined) ? (
              <div className="text-center py-8">
                <RuneSpinner size="md" label="Loading…" />
                <p className="text-muted-foreground mt-2">
                  Loading your duels...
                </p>
              </div>
            ) : !playerDuels || playerDuels.length === 0 ? (
              <EmptyState
                icon={<Swords className="size-7" aria-hidden="true" />}
                title="No duels yet!"
                description="Start a duel or try Quick Match above to begin."
              />
            ) : (
              // Compact rows: the big scene cards live on Watch Duels.
              <div className="grid gap-2 @3xl:grid-cols-2">
                {playerDuels.map((duel) => (
                  <DuelListItem
                    key={duel._id}
                    duel={duel}
                    variant="dashboard"
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold text-foreground mb-4 font-display">
              Open duels you can join
            </h3>
            {activeDuels === undefined ? (
              <div className="text-center py-8">
                <RuneSpinner size="md" label="Loading…" />
                <p className="text-muted-foreground mt-2">
                  Loading available duels...
                </p>
              </div>
            ) : activeDuels.filter(
                (duel) => !duel.players.includes(user?.id || ""),
              ).length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="mb-4 flex justify-center">
                    <Search className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No available duels
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create a new duel!
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <Link href="/duels/lobby">Quick Match</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/duels/create">Start a duel</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
                {activeDuels
                  .filter((duel) => !duel.players.includes(user?.id || ""))
                  .map((duel) => (
                    <DuelListItem key={duel._id} duel={duel} variant="card" />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
