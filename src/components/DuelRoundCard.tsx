"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConvexImage } from "@/components/ConvexImage";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { TimeAgo } from "@/components/TimeAgo";
import { Crown } from "@/components/ui/crown-icon";
import { D20Die } from "@/components/ui/d20-die";
import { Clock, Sparkles, RefreshCw, Undo2 } from "lucide-react";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { memo, useState, useEffect } from "react";

interface DuelRoundCardProps {
  round: Doc<"duelRounds">;
  duel: Doc<"duels">;
}

const UndoSpellButton = ({
  duelId,
  wizardId,
}: {
  duelId: Id<"duels">;
  wizardId: Id<"wizards">;
}) => {
  const [isUndoing, setIsUndoing] = useState(false);
  const undoSpell = useMutation(api.duels.undoSpell);

  const handleUndoSpell = async () => {
    setIsUndoing(true);
    try {
      await undoSpell({
        duelId,
        wizardId,
      });
    } catch (error) {
      console.error("Failed to undo spell:", error);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleUndoSpell}
      disabled={isUndoing}
      className="border-orange-200 dark:border-orange-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-300"
    >
      <Undo2 className="h-3 w-3 mr-1" />
      {isUndoing ? "Undoing..." : "Undo Spell"}
    </Button>
  );
};

export const DuelRoundCard = memo(function DuelRoundCard({
  round,
  duel,
}: DuelRoundCardProps) {
  const { user } = useUser();
  const [showReprocessButton, setShowReprocessButton] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const triggerRoundProcessing = useMutation(api.duels.triggerRoundProcessing);

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizardWithOwner,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );

  // Show reprocess button after 1 minute if round is stuck in PROCESSING
  useEffect(() => {
    if (round.status === "PROCESSING") {
      const timer = setTimeout(() => {
        setShowReprocessButton(true);
      }, 60000); // 1 minute

      return () => clearTimeout(timer);
    } else {
      setShowReprocessButton(false);
    }
  }, [round.status]);

  const handleReprocess = async () => {
    try {
      setIsReprocessing(true);
      await triggerRoundProcessing({
        duelId: duel._id,
        roundId: round._id,
      });
      setShowReprocessButton(false);
    } catch (error) {
      console.error("Failed to reprocess round:", error);
    } finally {
      setIsReprocessing(false);
    }
  };

  // Show loading state if wizards are still being fetched
  if (wizard1 === undefined || wizard2 === undefined) {
    return (
      <Card className="mb-4 w-full bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">
                {round.type === "CONCLUSION"
                  ? "Conclusion"
                  : `Round ${round.roundNumber}`}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400"></div>
            <span className="ml-2 text-muted-foreground">
              Loading round data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find the user's wizard in this duel
  const userWizard = [wizard1, wizard2].find(
    (wizard) => wizard?.owner === user?.id
  );

  const isWaitingForMyAction = () => {
    return (
      round.status === "WAITING_FOR_SPELLS" &&
      userWizard &&
      duel.needActionsFrom.includes(userWizard._id)
    );
  };

  const hasOtherWizardSubmitted = () => {
    if (!round.spells || !userWizard) return false;

    // Check if any wizard other than the current user has submitted a spell
    const otherWizards = duel.wizards.filter(
      (wizardId) => wizardId !== userWizard._id
    );
    return otherWizards.some((wizardId) => round.spells![wizardId]);
  };

  const getStatusBadge = () => {
    if (round.status === "COMPLETED") {
      return null; // No badge for completed rounds
    }

    if (isWaitingForMyAction()) {
      return (
        <Badge
          variant="default"
          className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700/50"
        >
          <Clock className="h-3 w-3 mr-1" />
          Your Turn - <TimeAgo timestamp={round._creationTime} />
        </Badge>
      );
    }

    if (round.status === "WAITING_FOR_SPELLS") {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700/50"
        >
          <Clock className="h-3 w-3 mr-1" />
          Actions Submitted
        </Badge>
      );
    }

    if (round.status === "PROCESSING") {
      return (
        <Badge
          variant="secondary"
          className="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700/50"
        >
          <Sparkles className="h-3 w-3 mr-1 animate-pulse" />
          Awaiting Narration
        </Badge>
      );
    }

    return null;
  };

  const getRoundTitle = () => {
    if (round.type === "CONCLUSION") {
      return "Conclusion";
    }
    return `Round ${round.roundNumber}`;
  };

  const isWinner = (wizardId: string) => {
    return duel.winners?.includes(wizardId as Id<"wizards">) || false;
  };

  const DeltaValue = ({ value }: { value: number }) => {
    if (value === 0) return <span>0</span>;
    if (value > 0)
      return <span className="font-bold text-green-600">+{value}</span>;
    return <span className="text-red-600 font-bold">{value}</span>;
  };

  const WizardName = ({ wizardId }: { wizardId: string }) => {
    const wizard = wizardId === duel.wizards[0] ? wizard1 : wizard2;
    const winner = isWinner(wizardId);
    return (
      <div className="flex flex-col items-center gap-1">
        <span
          className={`font-semibold flex items-center gap-1 ${winner ? "text-yellow-600 dark:text-yellow-400" : ""}`}
        >
          {winner && <Crown className="h-4 w-4" />}
          {wizard?.name || "Loading..."}
          {winner && <Crown className="h-4 w-4" />}
        </span>
        {wizard?.ownerUserId && (
          <UserIdDisplay
            userId={wizard.ownerUserId}
            displayName={wizard.ownerDisplayName}
            size="sm"
            showAvatar={false}
          />
        )}
      </div>
    );
  };

  const WizardThumbnail = ({ wizardId }: { wizardId: unknown }) => {
    const wizard = wizardId === duel.wizards[0] ? wizard1 : wizard2;

    if (!wizard?.illustration) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {wizard?.name?.charAt(0) || "?"}
          </span>
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md">
        <ConvexImage
          storageId={wizard.illustration}
          alt={wizard.name}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  return (
    <Card className="mb-4 w-full bg-card/90 backdrop-blur-sm border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-foreground">
              {getRoundTitle()}
            </div>
            {getStatusBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isWaitingForMyAction() && hasOtherWizardSubmitted() && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-lg">
            <p className="text-orange-800 dark:text-orange-200 font-medium">
              The other wizard has submitted their actions.
            </p>
          </div>
        )}

        {isWaitingForMyAction() && !hasOtherWizardSubmitted() && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Waiting for all wizards to submit their actions.
            </p>
          </div>
        )}

        {round.status === "WAITING_FOR_SPELLS" && !isWaitingForMyAction() && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Actions Submitted. Awaiting other wizard&apos;s actions.
              </p>
              {userWizard && (
                <UndoSpellButton duelId={duel._id} wizardId={userWizard._id} />
              )}
            </div>
          </div>
        )}

        {round.status === "PROCESSING" && (
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200/30 dark:border-purple-700/30 border-t-purple-600 dark:border-t-purple-400"></div>
                <div>
                  <p className="text-purple-800 dark:text-purple-200 font-medium">
                    The Arcane Arbiter is weaving the tale of this round...
                  </p>
                  {showReprocessButton && (
                    <p className="text-purple-600 dark:text-purple-400 text-sm mt-1">
                      Taking longer than expected? Try reprocessing the round.
                    </p>
                  )}
                </div>
              </div>
              {showReprocessButton && (
                <Button
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                  variant="outline"
                  size="sm"
                  className="ml-4 bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                >
                  {isReprocessing ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border border-purple-300 border-t-purple-600 mr-2"></div>
                      Reprocessing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Reprocess Round
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {round.status === "COMPLETED" && (
          <div className="space-y-6">
            {/* Winner Announcement for Conclusion Rounds */}
            {round.type === "CONCLUSION" &&
              duel.winners &&
              duel.winners.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-300 dark:border-yellow-600/50 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                      {duel.winners.length === 1
                        ? "Victory Declared!"
                        : "Honorable Draw!"}
                    </h3>
                    <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-lg text-yellow-700 dark:text-yellow-300 font-medium">
                    {duel.winners.length === 1 ? (
                      <>
                        {duel.wizards[0] === duel.winners[0]
                          ? wizard1?.name
                          : wizard2?.name}{" "}
                        emerges as the champion!
                      </>
                    ) : (
                      "Both wizards have proven their worth in this epic duel!"
                    )}
                  </p>
                </div>
              )}
            {/* Spell Actions Display */}
            {round.spells && duel.wizards.length >= 2 && (
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <div className="flex-1 flex gap-4 items-center min-w-64">
                  <WizardThumbnail wizardId={duel.wizards[0]} />
                  {round.spells[duel.wizards[0]] && (
                    <div className="flex-1">
                      <span className="bg-blue-500 text-white p-2 rounded inline-block max-w-xs">
                        {round.spells[duel.wizards[0]].description}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex gap-4 items-center">
                  {round.spells[duel.wizards[1]] && (
                    <div className="flex-1 text-right">
                      <span className="bg-blue-500 text-white p-2 rounded inline-block max-w-xs">
                        {round.spells[duel.wizards[1]].description}
                      </span>
                    </div>
                  )}
                  <WizardThumbnail wizardId={duel.wizards[1]} />
                </div>
              </div>
            )}

            {/* Round Illustration or Text-Only Placeholder */}
            {round.outcome?.illustration ? (
              <div className="bg-black aspect-square mb-4 max-w-2xl mx-auto rounded-lg overflow-hidden">
                <ConvexImage
                  storageId={round.outcome.illustration}
                  alt={
                    round.outcome.illustrationPrompt ||
                    `Round ${round.roundNumber} illustration`
                  }
                  width={800}
                  height={800}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : duel.textOnlyMode && round.outcome?.illustrationPrompt ? (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-dashed border-orange-300 dark:border-orange-600/50 aspect-square mb-4 max-w-2xl mx-auto rounded-lg flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-6xl mb-4">📜</div>
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                    Text-Only Mode
                  </h3>
                  <p className="text-sm text-orange-600 dark:text-orange-300 mb-4">
                    This round would have been illustrated, but the duel is in
                    text-only mode
                  </p>
                  <div className="text-xs text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 rounded-lg p-3 max-w-md">
                    <strong>Illustration prompt:</strong>{" "}
                    {round.outcome.illustrationPrompt}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Result */}
            {round.outcome?.result && (
              <div className="whitespace-pre-line text-xl italic text-foreground/90 leading-relaxed">
                {round.outcome.result}
              </div>
            )}

            {/* Narrative */}
            {round.outcome?.narrative && (
              <div className="whitespace-pre-line">
                <div className="text-foreground/80 leading-relaxed">
                  {round.outcome.narrative}
                </div>
              </div>
            )}

            {/* Outcome Table */}
            {(round.outcome?.pointsAwarded ||
              round.outcome?.healthChange ||
              round.outcome?.luckRolls) && (
              <div>
                <h3 className="text-lg font-bold mb-3">Outcome</h3>
                <div className="overflow-x-auto text-sm">
                  <table className="w-full border-collapse border border-border/50 rounded-lg">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border/50 p-2 text-left"></th>
                        <th
                          className={`border border-border/50 p-2 text-center ${
                            isWinner(duel.wizards[0])
                              ? "bg-yellow-100 dark:bg-yellow-900/30"
                              : ""
                          }`}
                        >
                          <WizardName wizardId={duel.wizards[0]} />
                        </th>
                        <th
                          className={`border border-border/50 p-2 text-center ${
                            isWinner(duel.wizards[1])
                              ? "bg-yellow-100 dark:bg-yellow-900/30"
                              : ""
                          }`}
                        >
                          <WizardName wizardId={duel.wizards[1]} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.outcome?.luckRolls && (
                        <tr>
                          <td className="border border-border/50 p-2 font-medium">
                            Luck Roll (D20)
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[0])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <div className="flex justify-center">
                              <D20Die
                                value={
                                  round.outcome.luckRolls[duel.wizards[0]] || 1
                                }
                                size="sm"
                              />
                            </div>
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[1])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <div className="flex justify-center">
                              <D20Die
                                value={
                                  round.outcome.luckRolls[duel.wizards[1]] || 1
                                }
                                size="sm"
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                      {round.outcome?.pointsAwarded && (
                        <tr>
                          <td className="border border-border/50 p-2 font-medium">
                            Points Awarded
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[0])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <span className="p-2 bg-background rounded min-w-14 inline-block">
                              <DeltaValue
                                value={
                                  round.outcome.pointsAwarded[
                                    duel.wizards[0]
                                  ] || 0
                                }
                              />
                            </span>
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[1])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <span className="p-2 bg-background rounded min-w-14 inline-block">
                              <DeltaValue
                                value={
                                  round.outcome.pointsAwarded[
                                    duel.wizards[1]
                                  ] || 0
                                }
                              />
                            </span>
                          </td>
                        </tr>
                      )}
                      {round.outcome?.healthChange && (
                        <tr>
                          <td className="border border-border/50 p-2 font-medium">
                            Hit Points Change
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[0])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <span className="p-2 bg-background rounded min-w-14 inline-block">
                              <DeltaValue
                                value={
                                  round.outcome.healthChange[duel.wizards[0]] ||
                                  0
                                }
                              />
                            </span>
                          </td>
                          <td
                            className={`border border-border/50 p-2 text-center ${
                              isWinner(duel.wizards[1])
                                ? "bg-yellow-100 dark:bg-yellow-900/30"
                                : ""
                            }`}
                          >
                            <span className="p-2 bg-background rounded min-w-14 inline-block">
                              <DeltaValue
                                value={
                                  round.outcome.healthChange[duel.wizards[1]] ||
                                  0
                                }
                              />
                            </span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
