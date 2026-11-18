"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id, Doc } from "../../../../convex/_generated/dataModel";
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
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";

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
    null,
  );
  const [isJoining, setIsJoining] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { id } = use(params);

  // Validate the ID format first
  const duelId = safeConvexId<"duels">(id);

  const duel = useQuery(api.duels.getDuel, duelId ? { duelId } : "skip");

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizardWithOwner,
    duel?.wizards[0] ? { wizardId: duel.wizards[0] } : "skip",
  );
  const wizard2 = useQuery(
    api.wizards.getWizardWithOwner,
    duel?.wizards[1] ? { wizardId: duel.wizards[1] } : "skip",
  );

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const castSpell = useMutation(api.duels.castSpell);
  const joinDuel = useMutation(api.duels.joinDuel);

  // Get user's wizards for joining
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Memoize expensive calculations
  const userWizard = useMemo(
    () =>
      [wizard1, wizard2].find(
        (wizard: Doc<"wizards"> | null | undefined) =>
          wizard?.owner === user?.id,
      ),
    [wizard1, wizard2, user?.id],
  );

  const userWizardId = userWizard?._id;

  const currentRound = useMemo(
    () =>
      duel?.rounds?.find(
        (round: Doc<"duelRounds">) => round.roundNumber === duel.currentRound,
      ),
    [duel?.rounds, duel?.currentRound],
  );

  const hasUserCastSpell = useMemo(
    () =>
      currentRound?.spells && userWizardId
        ? currentRound.spells[userWizardId] !== undefined
        : false,
    [currentRound?.spells, userWizardId],
  );

  const isPlayerInDuel = useMemo(
    () => duel?.players.includes(user?.id || ""),
    [duel?.players, user?.id],
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
      posthog.capture("spell_submitted", {
        round_number: duel.currentRound,
        is_campaign_battle: duel.isCampaignBattle,
        text_only_mode: duel.textOnlyMode,
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
      posthog.capture("duel_joined", { entry_point: "duel_page" });
      // No need to redirect, the page will update automatically
    } catch (error) {
      console.error("Failed to join duel:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyLink = async () => {
    if (!duel?.shortcode) return;

    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RuneSpinner size="lg" hideLabel label="Loading…" className="mb-6" />
          <div className="bg-card/90 backdrop-blur-sm border border-border/50 rounded-xl px-8 py-6 shadow-xl dark:shadow-2xl max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
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
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-destructive/50 bg-card/90 backdrop-blur-sm shadow-xl dark:shadow-2xl">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  {isInvalidId ? "Invalid Duel ID" : "Duel Not Found"}
                </CardTitle>
                <CardDescription>
                  {isInvalidId
                    ? "The duel ID in the URL is not valid."
                    : "We couldn't load the duel you're looking for."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">This could happen if:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-4">
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
                  <Button asChild variant="default">
                    <Link href="/duels">Browse Duels</Link>
                  </Button>
                  {!isInvalidId && (
                    <Button
                      variant="outline"
                      className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30"
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
            className="bg-warning/80 text-warning-foreground border-warning/50 flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            Waiting for Players
          </Badge>
        );
      case "IN_PROGRESS":
        return (
          <Badge
            variant="default"
            className="bg-success/80 text-success-foreground border-success/50 flex items-center gap-1"
          >
            <Sparkles className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-info/80 text-info-foreground border-info/50 flex items-center gap-1"
          >
            <Star className="h-3 w-3" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge
            variant="destructive"
            className="bg-destructive/80 text-destructive-foreground border-destructive/50 flex items-center gap-1"
          >
            <Swords className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-muted/80 text-foreground border-border/50"
          >
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-4xl mx-auto pb-48">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-gold-gradient font-display">
                {wizard1 && wizard2
                  ? `${wizard1.name} vs ${wizard2.name}`
                  : typeof duel.numberOfRounds === "number"
                    ? `${duel.numberOfRounds} Round Duel`
                    : "Duel to the Death"}
              </h2>
              <div className="flex items-center gap-2">
                {duel.isCampaignBattle && (
                  <Badge
                    variant="outline"
                    className="bg-primary/80 text-primary-foreground border-primary/50 flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Campaign Battle
                  </Badge>
                )}
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
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-success/40 hover:bg-success/10 text-success"
                  >
                    <Link href={`/duels/${duel._id}/share`}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Challenge
                    </Link>
                  </Button>
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
                    showOwner={true}
                  />
                )}

                <div className="flex items-center justify-center">
                  <div className="bg-linear-to-br from-primary to-gold border-2 border-white/20 dark:border-white/10 rounded-full p-2 shadow-xl dark:shadow-2xl backdrop-blur-sm scale-150 transform z-10 relative">
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
                    showOwner={true}
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
              <Card
                className={`mb-8 ${
                  duel.isCampaignBattle
                    ? "bg-arcane-soft border-2 border-primary/50"
                    : "bg-linear-to-r from-warning/20 to-gold/10 border-2 border-warning/40"
                } shadow-lg dark:shadow-xl`}
              >
                <CardHeader>
                  <CardTitle
                    className={`flex items-center justify-center gap-3 text-2xl ${
                      duel.isCampaignBattle ? "text-primary" : "text-warning"
                    }`}
                  >
                    {duel.isCampaignBattle ? (
                      <Sparkles className="h-8 w-8 text-primary" />
                    ) : (
                      <Crown className="h-8 w-8 text-warning" />
                    )}
                    {duel.winners.length === 1
                      ? duel.isCampaignBattle
                        ? "Campaign Victory!"
                        : "Victory!"
                      : "Draw!"}
                    {duel.isCampaignBattle ? (
                      <Sparkles className="h-8 w-8 text-primary" />
                    ) : (
                      <Crown className="h-8 w-8 text-warning" />
                    )}
                  </CardTitle>
                  <CardDescription
                    className={`text-center text-lg font-medium ${
                      duel.isCampaignBattle ? "text-primary" : "text-warning"
                    }`}
                  >
                    {duel.winners.length === 1 ? (
                      <>
                        {duel.wizards[0] === duel.winners[0]
                          ? wizard1?.name
                          : wizard2?.name}{" "}
                        {duel.isCampaignBattle
                          ? "defeats the AI opponent!"
                          : "emerges victorious!"}
                      </>
                    ) : (
                      "The duel ends in an honorable draw!"
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

          {duel.status === "WAITING_FOR_PLAYERS" && (
            <Card className="mb-8 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-5 w-5 text-warning animate-pulse" />
                  {duel.players.length < 2
                    ? "Waiting for Players"
                    : "Preparing Duel"}
                </CardTitle>
                <CardDescription>
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
                        <p className="text-muted-foreground mb-4">
                          You need a wizard to join this duel.
                        </p>
                        <Button asChild>
                          <Link href="/wizards/create">Create Wizard</Link>
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted-foreground mb-4">
                          Select a wizard to join this duel:
                        </p>
                        <div className="space-y-2 mb-4">
                          {wizards.map((wizard: Doc<"wizards">) => (
                            <div
                              key={wizard._id}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedWizard === wizard._id
                                  ? "border-primary bg-primary/8"
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
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
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
                          className="w-full"
                        >
                          {isJoining ? "Joining..." : "Join Duel"}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : duel.players.length < 2 ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Waiting for more players to join...
                    </p>
                    {duel.shortcode && (
                      <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Invite another wizard to duel
                        </p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Share this link with someone you want to challenge:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1.5 bg-primary/80 text-primary-foreground rounded-md text-sm font-mono border border-primary/50 flex-1 truncate">
                            {`${typeof window !== "undefined" ? window.location.origin : ""}/join/${duel.shortcode}`}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="border-primary/30 hover:bg-primary/8 text-primary"
                          >
                            {copySuccess ? "✓ Copied!" : "Copy Link"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <RuneSpinner size="sm" label="Loading" />
                    <p className="text-muted-foreground">
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

          {/* Show introduction for in-progress or completed duels */}
          {(duel.status === "IN_PROGRESS" || duel.status === "COMPLETED") && (
            <Card className="mb-8 bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ScrollText className="h-5 w-5 text-info" />
                  Arena Introduction
                </CardTitle>
                <CardDescription>
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
                .filter((round: Doc<"duelRounds">) => round.roundNumber > 0) // Exclude introduction round
                .map((round: Doc<"duelRounds">) => (
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
