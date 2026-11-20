"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "./ConvexImage";
import Image from "next/image";
import {
  Swords,
  Users,
  Calendar,
  Check,
  Sparkles,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";

interface JoinDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
}

export function JoinDuelForm({ onClose, onSuccess }: JoinDuelFormProps) {
  const { user } = useUser();
  const [selectedDuel, setSelectedDuel] = useState<Id<"duels"> | null>(null);
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null,
  );
  const [isJoining, setIsJoining] = useState(false);

  const availableDuels = useQuery(api.duels.getActiveDuels);
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Filter duels that are waiting for players and not created by current user
  const joinableDuels =
    availableDuels?.filter(
      (duel) =>
        duel.status === "WAITING_FOR_PLAYERS" &&
        !duel.players.includes(user?.id || ""),
    ) || [];

  const handleWizardSelect = (wizardId: Id<"wizards">) => {
    setSelectedWizard(wizardId);
  };

  const joinDuel = useMutation(api.duels.joinDuel);

  const handleJoinDuel = async () => {
    if (!user?.id || !selectedDuel || !selectedWizard) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: selectedDuel,
        wizards: [selectedWizard],
      });
      posthog.capture("duel_joined", { entry_point: "duel_browser" });
      onSuccess(selectedDuel);
    } catch (error) {
      console.error("Failed to join duel:", error);
      toast.error(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't join the duel. Please try again.",
      );
    } finally {
      setIsJoining(false);
    }
  };

  if (!wizards || wizards.length === 0) {
    return (
      <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className="h-5 w-5 text-warning" />
            No Wizards Available
          </CardTitle>
          <CardDescription>
            You need at least one wizard to join a duel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Create a wizard first before joining a duel.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (joinableDuels.length === 0) {
    return (
      <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Swords className="h-5 w-5 text-muted-foreground" />
            No Duels Available
          </CardTitle>
          <CardDescription>
            No duels available to join right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            There are no open duels waiting for players. Create your own duel to
            get started!
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg dark:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Swords className="h-5 w-5 text-primary" />
          Join a Duel
        </CardTitle>
        <CardDescription>
          Choose a duel to join and select your wizard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            Available Duels
          </label>
          <div className="space-y-3">
            {joinableDuels.map((duel) => (
              <div
                key={duel._id}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-lg ${
                  selectedDuel === duel._id
                    ? "border-primary/50 bg-primary/80 shadow-lg dark:shadow-xl backdrop-blur-sm"
                    : "border-border/50 hover:border-primary/50 bg-background/50 backdrop-blur-sm"
                }`}
                onClick={() => setSelectedDuel(duel._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground">
                        {typeof duel.numberOfRounds === "number"
                          ? `${duel.numberOfRounds} Round Duel`
                          : "Duel to the Death"}
                      </h4>
                      <Badge
                        variant="secondary"
                        className="bg-info/80 text-info-foreground border-info/50 flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {duel.wizards.length} wizard
                        {duel.wizards.length !== 1 ? "s" : ""}
                      </Badge>
                      {duel.creatorCoversEntry && (
                        <Badge
                          variant="secondary"
                          className="bg-gold/20 text-foreground border-gold/50"
                        >
                          Free entry
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(duel.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedDuel === duel._id && (
                    <div className="w-6 h-6 bg-linear-to-r from-primary to-gold rounded-full flex items-center justify-center shadow-lg">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedDuel && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <UserPlus className="h-4 w-4 text-primary" />
              Select Your Wizard
            </label>
            <div className="grid grid-cols-1 gap-3">
              {wizards.map((wizard) => (
                <div
                  key={wizard._id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedWizard === wizard._id
                      ? "border-primary bg-primary/8"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleWizardSelect(wizard._id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Wizard Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      {wizard.illustration ? (
                        <ConvexImage
                          storageId={wizard.illustration}
                          alt={wizard.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : wizard.illustrationURL ? (
                        <Image
                          src={wizard.illustrationURL}
                          alt={wizard.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-arcane flex items-center justify-center text-white font-bold text-lg">
                          {wizard.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Wizard Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">
                        {wizard.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {wizard.description}
                      </p>
                    </div>

                    {/* Stats and Selection Indicator */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {wizard.wins || wizard.losses ? (
                        <Badge variant="outline">
                          {wizard.wins || 0}W - {wizard.losses || 0}L
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                      {selectedWizard === wizard._id && (
                        <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {!selectedWizard && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-2 p-2 bg-destructive/50 rounded-lg border border-destructive/50">
                <AlertCircle className="h-4 w-4" />
                Please select a wizard
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleJoinDuel}
            disabled={!selectedDuel || !selectedWizard || isJoining}
            className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <RuneSpinner size="xs" label="Working…" className="mr-2" />
                Joining Duel...
              </>
            ) : (
              <>
                <Swords className="h-4 w-4 mr-2" />
                Join Duel
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isJoining}
            className="border-border/50 hover:bg-accent/50 dark:hover:bg-accent/30 disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
