"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConvexImage } from "@/components/ConvexImage";
import { Clock, Sparkles } from "lucide-react";

interface DuelRoundCardProps {
  round: any; // Using any for now to avoid type complexity
  duel: any;
}

export function DuelRoundCard({ round, duel }: DuelRoundCardProps) {
  const { user } = useUser();

  // Fetch wizard data for each wizard in the duel
  const wizard1 = useQuery(
    api.wizards.getWizard,
    duel.wizards[0] ? { wizardId: duel.wizards[0] } : "skip"
  );
  const wizard2 = useQuery(
    api.wizards.getWizard,
    duel.wizards[1] ? { wizardId: duel.wizards[1] } : "skip"
  );

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
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-200/30 border-t-purple-600"></div>
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

  const getStatusBadge = () => {
    if (round.status === "COMPLETED") {
      return null; // No badge for completed rounds
    }

    if (isWaitingForMyAction()) {
      return (
        <Badge
          variant="default"
          className="bg-orange-100 text-orange-800 border-orange-200"
        >
          <Clock className="h-3 w-3 mr-1" />
          Your Turn
        </Badge>
      );
    }

    if (round.status === "WAITING_FOR_SPELLS") {
      return (
        <Badge
          variant="secondary"
          className="bg-blue-100 text-blue-800 border-blue-200"
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
          className="bg-purple-100 text-purple-800 border-purple-200"
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

  const DeltaValue = ({ value }: { value: number }) => {
    if (value === 0) return <span>0</span>;
    if (value > 0)
      return <span className="font-bold text-green-600">+{value}</span>;
    return <span className="text-red-600 font-bold">{value}</span>;
  };

  const WizardName = ({ wizardId }: { wizardId: any }) => {
    const wizard = wizardId === duel.wizards[0] ? wizard1 : wizard2;
    return (
      <span className="font-semibold">{wizard?.name || "Loading..."}</span>
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
        {isWaitingForMyAction() && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-orange-800 font-medium">
              The other wizard has submitted their actions.
            </p>
          </div>
        )}

        {round.status === "WAITING_FOR_SPELLS" && !isWaitingForMyAction() && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
              Actions Submitted. Awaiting other wizard's actions.
            </p>
          </div>
        )}

        {round.status === "PROCESSING" && (
          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-purple-800 font-medium">Awaiting narration.</p>
          </div>
        )}

        {round.status === "COMPLETED" && (
          <div className="space-y-6">
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

            {/* Round Illustration */}
            {round.outcome?.illustration && (
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
            )}

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
            {(round.outcome?.pointsAwarded || round.outcome?.healthChange) && (
              <div>
                <h3 className="text-lg font-bold mb-3">Outcome</h3>
                <div className="overflow-x-auto text-sm">
                  <table className="w-full border-collapse border border-border/50 rounded-lg">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="border border-border/50 p-2 text-left"></th>
                        <th className="border border-border/50 p-2 text-center">
                          <WizardName wizardId={duel.wizards[0]} />
                        </th>
                        <th className="border border-border/50 p-2 text-center">
                          <WizardName wizardId={duel.wizards[1]} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.outcome?.pointsAwarded && (
                        <tr>
                          <td className="border border-border/50 p-2 font-medium">
                            Points Awarded
                          </td>
                          <td className="border border-border/50 p-2 text-center">
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
                          <td className="border border-border/50 p-2 text-center">
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
                          <td className="border border-border/50 p-2 text-center">
                            <span className="p-2 bg-background rounded min-w-14 inline-block">
                              <DeltaValue
                                value={
                                  round.outcome.healthChange[duel.wizards[0]] ||
                                  0
                                }
                              />
                            </span>
                          </td>
                          <td className="border border-border/50 p-2 text-center">
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
}
