"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { useState } from "react";
import { Swords, Clock, Sparkles, ScrollText, Star } from "lucide-react";
import { ConvexImage } from "@/components/ConvexImage";
import { DuelIntroduction } from "@/components/DuelIntroduction";
import { WizardCard } from "@/components/WizardCard";

interface DuelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DuelPage({ params }: DuelPageProps) {
  const { user } = useUser();
  const [spellDescription, setSpellDescription] = useState("");
  const [isCasting, setIsCasting] = useState(false);
  const { id } = use(params);

  const duel = useQuery(api.duels.getDuel, {
    duelId: id as Id<"duels">,
  });

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );

  // Check for loading and error states
  const isDuelLoading = duel === undefined;
  const isDuelError = duel === null;

  // Find the user's wizard in this duel
  const userWizard = [wizard1, wizard2].find(
    (wizard) => wizard?.owner === user?.id
  );
  const userWizardId = userWizard?._id;
  const startDuel = useMutation(api.duels.startDuel);
  const castSpell = useMutation(api.duels.castSpell);

  // Get the current round to check if user has already cast a spell
  const currentRound = duel?.rounds?.find(
    (round) => round.roundNumber === duel.currentRound
  );
  const hasUserCastSpell =
    currentRound?.spells && userWizardId
      ? currentRound.spells[userWizardId] !== undefined
      : false;

  const isPlayerInDuel = duel?.players.includes(user?.id || "");
  const canStartDuel =
    duel?.status === "WAITING_FOR_PLAYERS" &&
    duel?.players.length >= 2 &&
    isPlayerInDuel;

  const handleStartDuel = async () => {
    if (!duel) return;
    try {
      await startDuel({ duelId: duel._id });
    } catch (error) {
      console.error("Failed to start duel:", error);
    }
  };

  const handleCastSpell = async () => {
    if (!duel || !spellDescription.trim() || !userWizardId) return;

    setIsCasting(true);
    try {
      await castSpell({
        duelId: duel._id,
        wizardId: userWizardId,
        spellDescription: spellDescription.trim(),
      });
      setSpellDescription("");
    } catch (error) {
      console.error("Failed to cast spell:", error);
    } finally {
      setIsCasting(false);
    }
  };

  // Show loading state
  if (isDuelLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400 mx-auto"></div>
            <div
              className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-purple-400/60 dark:border-t-purple-300/60 animate-spin mx-auto"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
            <div
              className="absolute inset-2 rounded-full h-12 w-12 border-2 border-transparent border-t-purple-500/40 dark:border-t-purple-200/40 animate-spin mx-auto"
              style={{ animationDuration: "2s" }}
            ></div>
          </div>
          <div className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl px-8 py-6 shadow-xl dark:shadow-2xl max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
              <p className="text-foreground font-semibold">Loading duel...</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Preparing the magical arena
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isDuelError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
        <Navbar />
        <main className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50 dark:border-destructive/30 bg-card/90 dark:bg-card/95 backdrop-blur-sm shadow-xl dark:shadow-2xl">
              <CardHeader>
                <CardTitle className="text-destructive dark:text-red-400 flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  Error Loading Duel
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  We couldn&apos;t load the duel you&apos;re looking for.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground dark:text-muted-foreground/90">
                  This could happen if:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground dark:text-muted-foreground/80 space-y-1 ml-4">
                  <li>The duel doesn&apos;t exist or has been deleted</li>
                  <li>You don&apos;t have permission to view this duel</li>
                  <li>There&apos;s a temporary connection issue</li>
                </ul>
                <div className="flex gap-3 pt-4">
                  <Button
                    asChild
                    variant="default"
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                  >
                    <Link href="/duels">Browse Duels</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
                    onClick={() => window.location.reload()}
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_PLAYERS":
        return (
          <Badge
            variant="secondary"
            className="bg-orange-100/80 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200/50 dark:border-orange-700/30 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            Waiting for Players
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="default"
            className="bg-green-100/80 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="bg-red-100/80 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-200/50 dark:border-red-700/30 flex items-center gap-1"
          >
            <Swords className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-gray-100/80 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200 border-gray-200/50 dark:border-gray-700/30"
          >
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto pb-48">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-foreground dark:text-foreground/95 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {typeof duel.numberOfRounds === "number"
                  ? `${duel.numberOfRounds} Round Duel`
                  : "Duel to the Death"}
              </h2>
              {getStatusBadge(duel.status)}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Round {duel.currentRound} • Created{" "}
                {new Date(duel.createdAt).toLocaleDateString()}
              </p>
              {duel.shortcode && duel.status === "WAITING_FOR_PLAYERS" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground dark:text-muted-foreground/80">
                    Share:
                  </span>
                  <code className="px-3 py-1.5 bg-purple-100/80 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-md text-sm font-mono border border-purple-200/50 dark:border-purple-700/30">
                    {duel.shortcode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-purple-200 dark:border-purple-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    onClick={() => {
                      const url = `${window.location.origin}/join/${duel.shortcode}`;
                      navigator.clipboard.writeText(url);
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Wizard Display Section */}
          {duel.wizards.length >= 2 && (wizard1 || wizard2) && (
            <div className="mb-8 relative">
              <div className="flex flex-col relative items-stretch md:flex-row">
                {/* Wizard 1 */}
                {wizard1 && (
                  <WizardCard
                    wizard={wizard1}
                    points={duel.points[duel.wizards[0]] || 0}
                    hitPoints={duel.hitPoints[duel.wizards[0]] || 100}
                    isUserWizard={wizard1.owner === user?.id}
                  />
                )}

                <div className="flex items-center justify-center">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-600 dark:to-pink-600 border-2 border-white/20 dark:border-white/10 rounded-full p-2 shadow-xl dark:shadow-2xl backdrop-blur-sm scale-150 transform z-10 relative">
                    <Swords className="h-6 w-6 text-white animate-pulse" />
                  </div>
                </div>

                {/* Wizard 2 */}
                {wizard2 && (
                  <WizardCard
                    wizard={wizard2}
                    points={duel.points[duel.wizards[1]] || 0}
                    hitPoints={duel.hitPoints[duel.wizards[1]] || 100}
                    isUserWizard={wizard2.owner === user?.id}
                  />
                )}
              </div>
            </div>
          )}

          {duel.status === "WAITING_FOR_PLAYERS" && (
            <Card className="mb-8 bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400 animate-pulse" />
                  Waiting for Players
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  {duel.players.length < 2
                    ? "Waiting for more players to join..."
                    : "Ready to start! Click the button below to begin the duel."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isPlayerInDuel ? (
                  <p className="text-muted-foreground dark:text-muted-foreground/80">
                    You are not part of this duel.
                    <Link
                      href="/duels/join"
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline ml-1 transition-colors"
                    >
                      Join a different duel
                    </Link>
                  </p>
                ) : canStartDuel ? (
                  <Button
                    onClick={handleStartDuel}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Duel
                  </Button>
                ) : (
                  <p className="text-muted-foreground dark:text-muted-foreground/80">
                    Waiting for more players to join...
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Floating Spell Input - Fixed position when user needs to act */}
          {duel.status === "IN_PROGRESS" &&
            isPlayerInDuel &&
            userWizard &&
            userWizardId &&
            !hasUserCastSpell && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-6">
                <Card className="bg-card/95 dark:bg-card/98 backdrop-blur-md border-2 border-purple-500/50 dark:border-purple-400/50 shadow-2xl dark:shadow-3xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95 text-lg">
                      <Sparkles className="h-5 w-5 text-purple-500 dark:text-purple-400 animate-pulse" />
                      Cast Your Spell
                    </CardTitle>
                    <CardDescription className="dark:text-muted-foreground/80 text-sm">
                      Describe the magical spell {userWizard.name} will cast
                      this round
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <textarea
                        value={spellDescription}
                        onChange={(e) => setSpellDescription(e.target.value)}
                        placeholder="Describe your wizard's spell in detail..."
                        className="w-full p-3 border border-input/50 dark:border-input/30 bg-background/50 dark:bg-background/30 text-foreground dark:text-foreground/95 rounded-lg resize-none h-24 placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/50 focus:border-purple-500/50 dark:focus:border-purple-400/50 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all backdrop-blur-sm text-sm"
                        disabled={isCasting}
                      />
                      <Button
                        onClick={handleCastSpell}
                        disabled={!spellDescription.trim() || isCasting}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCasting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                            Casting Spell...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Cast Spell with {userWizard.name}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Show waiting message when user has cast but others haven't */}
          {duel.status === "IN_PROGRESS" &&
            isPlayerInDuel &&
            userWizard &&
            userWizardId &&
            hasUserCastSpell &&
            duel.needActionsFrom.length > 0 && (
              <Card className="mb-8 bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                    <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400 animate-pulse" />
                    Waiting for Other Wizards
                  </CardTitle>
                  <CardDescription className="dark:text-muted-foreground/80">
                    {userWizard.name} has cast their spell. Waiting for{" "}
                    {duel.needActionsFrom.length} other wizard
                    {duel.needActionsFrom.length !== 1 ? "s" : ""} to cast their
                    spells.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/80">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-200/30 dark:border-orange-700/30 border-t-orange-500 dark:border-t-orange-400"></div>
                    The round will continue once all wizards have cast their
                    spells...
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Show introduction for in-progress or completed duels */}
          {(duel.status === "IN_PROGRESS" || duel.status === "COMPLETED") && (
            <Card className="mb-8 bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <ScrollText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  Arena Introduction
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  The Arcane Arbiter introduces the combatants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DuelIntroduction duelId={duel._id} />
              </CardContent>
            </Card>
          )}

          {duel.rounds && duel.rounds.length > 0 && (
            <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <ScrollText className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                  Duel History
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  Previous rounds and their outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {duel.rounds
                    .filter((round) => round.roundNumber > 0) // Exclude introduction round
                    .map((round) => (
                      <div
                        key={round._id}
                        className="border-l-4 border-purple-300/60 dark:border-purple-600/40 pl-6 relative"
                      >
                        <div className="absolute -left-2 top-0 w-4 h-4 bg-purple-500 dark:bg-purple-400 rounded-full border-2 border-background"></div>
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="font-semibold text-foreground dark:text-foreground/95">
                            Round {round.roundNumber}
                          </h4>
                          <Badge
                            variant="outline"
                            className="border-border/50 dark:border-border/30 bg-background/50 dark:bg-background/30 text-muted-foreground dark:text-muted-foreground/80"
                          >
                            {round.status}
                          </Badge>
                        </div>
                        {round.outcome && (
                          <div className="text-sm text-muted-foreground dark:text-muted-foreground/80 space-y-3">
                            <p className="leading-relaxed">
                              {round.outcome.narrative}
                            </p>
                            {round.outcome.illustration && (
                              <div className="mt-3 max-w-md">
                                <ConvexImage
                                  storageId={round.outcome.illustration}
                                  alt={`Round ${round.roundNumber} illustration`}
                                  className="w-full rounded-lg shadow-md dark:shadow-lg border border-border/20 dark:border-border/10"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
