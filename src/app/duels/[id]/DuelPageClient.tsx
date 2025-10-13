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
import { useState, useMemo } from "react";
import {
  Swords,
  Clock,
  Sparkles,
  ScrollText,
  Star,
  Share2,
} from "lucide-react";
import { Crown } from "@/components/ui/crown-icon";

import { DuelIntroduction } from "@/components/DuelIntroduction";
import { WizardCard } from "@/components/WizardCard";
import { DuelRoundCard } from "@/components/DuelRoundCard";
import { CastSpellModal } from "@/components/CastSpellModal";
import { DuelModeIndicator } from "@/components/DuelModeIndicator";
import { safeConvexId } from "../../../lib/utils";

interface DuelPageClientProps {
  params: Promise<{
    id: string;
  }>;
}

export default function DuelPageClient({ params }: DuelPageClientProps) {
  const { user } = useUser();
  const [spellDescription, setSpellDescription] = useState("");
  const [isCasting, setIsCasting] = useState(false);
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null
  );
  const [isJoining, setIsJoining] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { id } = use(params);

  // Validate the ID format first
  const duelId = safeConvexId<"duels">(id);

  const duel = useQuery(api.duels.getDuel, duelId ? { duelId } : "skip");

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizard,
    duel?.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const castSpell = useMutation(api.duels.castSpell);
  const joinDuel = useMutation(api.duels.joinDuel);

  // Get user's wizards for joining
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Memoize expensive calculations
  const userWizard = useMemo(
    () => [wizard1, wizard2].find((wizard) => wizard?.owner === user?.id),
    [wizard1, wizard2, user?.id]
  );

  const userWizardId = userWizard?._id;

  const currentRound = useMemo(
    () =>
      duel?.rounds?.find((round) => round.roundNumber === duel.currentRound),
    [duel?.rounds, duel?.currentRound]
  );

  const hasUserCastSpell = useMemo(
    () =>
      currentRound?.spells && userWizardId
        ? currentRound.spells[userWizardId] !== undefined
        : false,
    [currentRound?.spells, userWizardId]
  );

  const isPlayerInDuel = useMemo(
    () => duel?.players.includes(user?.id || ""),
    [duel?.players, user?.id]
  );

  // Check for loading and error states
  const isDuelLoading = duel === undefined && duelId !== null;
  const isDuelError = duel === null || duelId === null;

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

  const handleJoinDuel = async () => {
    if (!user?.id || !duel || !selectedWizard) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: duel._id,
        wizards: [selectedWizard],
      });
      // No need to redirect, the page will update automatically
    } catch (error) {
      console.error("Failed to join duel:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyLink = async () => {
    if (!duel?.shortcode) return;

    const url = `${window.location.origin}/join/${duel.shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
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
    const isInvalidId = duelId === null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 dark:from-purple-950 dark:via-slate-900 dark:to-indigo-950">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50 dark:border-destructive/30 bg-card/90 dark:bg-card/95 backdrop-blur-sm shadow-xl dark:shadow-2xl">
              <CardHeader>
                <CardTitle className="text-destructive dark:text-red-400 flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  {isInvalidId ? "Invalid Duel ID" : "Duel Not Found"}
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  {isInvalidId
                    ? "The duel ID in the URL is not valid."
                    : "We couldn't load the duel you're looking for."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground dark:text-muted-foreground/90">
                  This could happen if:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground dark:text-muted-foreground/80 space-y-1 ml-4">
                  {isInvalidId ? (
                    <>
                      <li>The URL was typed incorrectly</li>
                      <li>The link you followed is broken or incomplete</li>
                      <li>The duel ID format is invalid</li>
                    </>
                  ) : (
                    <>
                      <li>The duel doesn&apos;t exist or has been deleted</li>
                      <li>You don&apos;t have permission to view this duel</li>
                      <li>There&apos;s a temporary connection issue</li>
                    </>
                  )}
                </ul>
                <div className="flex gap-3 pt-4">
                  <Button
                    asChild
                    variant="default"
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                  >
                    <Link href="/duels">Browse Duels</Link>
                  </Button>
                  {!isInvalidId && (
                    <Button
                      variant="outline"
                      className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // At this point, duel is guaranteed to be defined (not null or undefined)
  if (!duel) {
    throw new Error("Duel should be defined at this point");
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
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto pb-48">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {wizard1 && wizard2
                  ? `${wizard1.name} vs ${wizard2.name}`
                  : typeof duel.numberOfRounds === "number"
                    ? `${duel.numberOfRounds} Round Duel`
                    : "Duel to the Death"}
              </h2>
              <div className="flex items-center gap-2">
                <DuelModeIndicator
                  textOnlyMode={duel.textOnlyMode}
                  textOnlyReason={duel.textOnlyReason}
                />
                {getStatusBadge(duel.status)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Round {duel.currentRound} • Created{" "}
                {new Date(duel.createdAt).toLocaleDateString()}
              </p>
              {duel.status === "WAITING_FOR_PLAYERS" &&
                userWizard &&
                userWizard._id === duel.wizards[0] && (
                  <Link href={`/duels/${duel._id}/share`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-200 dark:border-green-700/50 hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Challenge
                    </Button>
                  </Link>
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
                    isWinner={duel.winners?.includes(duel.wizards[0]) || false}
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
                    isWinner={duel.winners?.includes(duel.wizards[1]) || false}
                  />
                )}
              </div>
            </div>
          )}

          {/* Text-Only Mode Explanation */}
          {duel.textOnlyMode && (
            <div className="mb-8">
              <DuelModeIndicator
                textOnlyMode={duel.textOnlyMode}
                textOnlyReason={duel.textOnlyReason}
                showDetails={true}
              />
            </div>
          )}

          {/* Winner Announcement for Completed Duels */}
          {duel.status === "COMPLETED" &&
            duel.winners &&
            duel.winners.length > 0 && (
              <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-300 dark:border-yellow-600/50 shadow-lg dark:shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-3 text-2xl text-yellow-800 dark:text-yellow-200">
                    <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    {duel.winners.length === 1 ? "Victory!" : "Draw!"}
                    <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </CardTitle>
                  <CardDescription className="text-center text-yellow-700 dark:text-yellow-300 text-lg font-medium">
                    {duel.winners.length === 1 ? (
                      <>
                        {duel.wizards[0] === duel.winners[0]
                          ? wizard1?.name
                          : wizard2?.name}{" "}
                        emerges victorious!
                      </>
                    ) : (
                      "The duel ends in an honorable draw!"
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          {duel.status === "WAITING_FOR_PLAYERS" && (
            <Card className="mb-8 bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
                  <Clock className="h-5 w-5 text-orange-500 dark:text-orange-400 animate-pulse" />
                  {duel.players.length < 2
                    ? "Waiting for Players"
                    : "Preparing Duel"}
                </CardTitle>
                <CardDescription className="dark:text-muted-foreground/80">
                  {duel.players.length < 2
                    ? "This duel needs one more player to begin"
                    : "Generating magical introduction and preparing the arena..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isPlayerInDuel ? (
                  <div className="space-y-4">
                    {!wizards || wizards.length === 0 ? (
                      <div>
                        <p className="text-muted-foreground dark:text-muted-foreground/80 mb-4">
                          You need a wizard to join this duel.
                        </p>
                        <Link href="/wizards/create">
                          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                            Create Wizard
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted-foreground dark:text-muted-foreground/80 mb-4">
                          Select a wizard to join this duel:
                        </p>
                        <div className="space-y-2 mb-4">
                          {wizards.map((wizard) => (
                            <div
                              key={wizard._id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedWizard === wizard._id
                                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                                  : "border-border hover:border-muted-foreground"
                              }`}
                              onClick={() => setSelectedWizard(wizard._id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{wizard.name}</h4>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {wizard.description}
                                  </p>
                                </div>
                                {selectedWizard === wizard._id && (
                                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">
                                      ✓
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={handleJoinDuel}
                          disabled={!selectedWizard || isJoining}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          {isJoining ? "Joining..." : "Join Duel"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : duel.players.length < 2 ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground dark:text-muted-foreground/80">
                      Waiting for more players to join...
                    </p>
                    {duel.shortcode && (
                      <div className="bg-background/50 dark:bg-background/30 rounded-lg p-4 border border-border/30">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Invite another wizard to duel
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Share this link with someone you want to challenge:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1.5 bg-purple-100/80 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-md text-sm font-mono border border-purple-200/50 dark:border-purple-700/30 flex-1 truncate">
                            {`${window.location.origin}/join/${duel.shortcode}`}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="border-purple-200 dark:border-purple-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                          >
                            {copySuccess ? "✓ Copied!" : "Copy Link"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400"></div>
                    <p className="text-muted-foreground dark:text-muted-foreground/80">
                      The Arcane Arbiter is preparing the magical arena...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cast Spell Modal */}
          {duel.status === "IN_PROGRESS" &&
            isPlayerInDuel &&
            userWizard &&
            userWizardId &&
            !hasUserCastSpell && (
              <CastSpellModal
                currentRound={duel.currentRound}
                wizardName={userWizard.name}
                spellDescription={spellDescription}
                onSpellDescriptionChange={setSpellDescription}
                onCastSpell={handleCastSpell}
                isCasting={isCasting}
              />
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

          {/* Individual Round Cards */}
          {duel.rounds && duel.rounds.length > 0 && (
            <div className="space-y-6">
              {duel.rounds
                .filter((round) => round.roundNumber > 0) // Exclude introduction round
                .map((round) => (
                  <DuelRoundCard
                    key={`${round._id}-${round.status}-${round.roundNumber}`}
                    round={round}
                    duel={duel}
                  />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
