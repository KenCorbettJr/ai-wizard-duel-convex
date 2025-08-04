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
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  Swords, 
  Users, 
  Calendar, 
  Check, 
  Trophy, 
  Sparkles, 
  UserPlus,
  AlertCircle,
  Loader2
} from "lucide-react";

interface JoinDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
}

export function JoinDuelForm({ onClose, onSuccess }: JoinDuelFormProps) {
  const { user } = useUser();
  const [selectedDuel, setSelectedDuel] = useState<Id<"duels"> | null>(null);
  const [selectedWizards, setSelectedWizards] = useState<Id<"wizards">[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  const availableDuels = useQuery(api.duels.getActiveDuels);
  const wizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? { userId: user.id } : "skip",
  );

  // Filter duels that are waiting for players and not created by current user
  const joinableDuels =
    availableDuels?.filter(
      (duel) =>
        duel.status === "WAITING_FOR_PLAYERS" &&
        !duel.players.includes(user?.id || ""),
    ) || [];

  const handleWizardToggle = (wizardId: Id<"wizards">) => {
    setSelectedWizards((prev) =>
      prev.includes(wizardId)
        ? prev.filter((id) => id !== wizardId)
        : [...prev, wizardId],
    );
  };

  const joinDuel = useMutation(api.duels.joinDuel);

  const handleJoinDuel = async () => {
    if (!user?.id || !selectedDuel || selectedWizards.length === 0) return;

    setIsJoining(true);
    try {
      await joinDuel({
        duelId: selectedDuel,
        userId: user.id,
        wizards: selectedWizards,
      });
      onSuccess(selectedDuel);
    } catch (error) {
      console.error("Failed to join duel:", error);
    } finally {
      setIsJoining(false);
    }
  };

  if (!wizards || wizards.length === 0) {
    return (
      <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
            <AlertCircle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
            No Wizards Available
          </CardTitle>
          <CardDescription className="dark:text-muted-foreground/80">
            You need at least one wizard to join a duel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground dark:text-muted-foreground/80 mb-4">
            Create a wizard first before joining a duel.
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
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
      <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
            <Swords className="h-5 w-5 text-muted-foreground dark:text-muted-foreground/80" />
            No Duels Available
          </CardTitle>
          <CardDescription className="dark:text-muted-foreground/80">
            No duels available to join right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground dark:text-muted-foreground/80 mb-4">
            There are no open duels waiting for players. Create your own duel to
            get started!
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/90 dark:bg-card/95 backdrop-blur-sm border-border/50 dark:border-border/30 shadow-lg dark:shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground dark:text-foreground/95">
          <Swords className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Join a Duel
        </CardTitle>
        <CardDescription className="dark:text-muted-foreground/80">
          Choose a duel to join and select your wizards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground/95 mb-3">
            <Sparkles className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            Available Duels
          </label>
          <div className="space-y-3">
            {joinableDuels.map((duel) => (
              <div
                key={duel._id}
                className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-lg ${
                  selectedDuel === duel._id
                    ? "border-purple-500/50 dark:border-purple-400/50 bg-purple-50/80 dark:bg-purple-950/30 shadow-lg dark:shadow-xl backdrop-blur-sm"
                    : "border-border/50 dark:border-border/30 hover:border-purple-300/50 dark:hover:border-purple-600/30 bg-background/50 dark:bg-background/30 backdrop-blur-sm"
                }`}
                onClick={() => setSelectedDuel(duel._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground dark:text-foreground/95">
                        {typeof duel.numberOfRounds === "number"
                          ? `${duel.numberOfRounds} Round Duel`
                          : "Duel to the Death"}
                      </h4>
                      <Badge 
                        variant="secondary"
                        className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        {duel.wizards.length} wizard{duel.wizards.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground dark:text-muted-foreground/80">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(duel.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedDuel === duel._id && (
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full flex items-center justify-center shadow-lg">
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
            <label className="flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground/95 mb-3">
              <UserPlus className="h-4 w-4 text-purple-500 dark:text-purple-400" />
              Select Your Wizards
            </label>
            <div className="grid grid-cols-1 gap-3">
              {wizards.map((wizard) => (
                <div
                  key={wizard._id}
                  className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:shadow-lg ${
                    selectedWizards.includes(wizard._id)
                      ? "border-purple-500/50 dark:border-purple-400/50 bg-purple-50/80 dark:bg-purple-950/30 shadow-lg dark:shadow-xl backdrop-blur-sm"
                      : "border-border/50 dark:border-border/30 hover:border-purple-300/50 dark:hover:border-purple-600/30 bg-background/50 dark:bg-background/30 backdrop-blur-sm"
                  }`}
                  onClick={() => handleWizardToggle(wizard._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground dark:text-foreground/95 mb-1">
                        {wizard.name}
                      </h4>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground/80 truncate">
                        {wizard.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {wizard.wins || wizard.losses ? (
                        <Badge 
                          variant="outline"
                          className="bg-green-100/80 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-200/50 dark:border-green-700/30 flex items-center gap-1"
                        >
                          <Trophy className="h-3 w-3" />
                          {wizard.wins || 0}W - {wizard.losses || 0}L
                        </Badge>
                      ) : (
                        <Badge 
                          variant="secondary"
                          className="bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200/50 dark:border-blue-700/30 flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          New
                        </Badge>
                      )}
                      {selectedWizards.includes(wizard._id) && (
                        <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedWizards.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive dark:text-red-400 mt-2 p-2 bg-red-50/50 dark:bg-red-950/20 rounded-lg border border-red-200/50 dark:border-red-800/30">
                <AlertCircle className="h-4 w-4" />
                Please select at least one wizard
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleJoinDuel}
            disabled={
              !selectedDuel || selectedWizards.length === 0 || isJoining
            }
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-500 dark:to-pink-500 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            className="border-border/50 dark:border-border/30 hover:bg-accent/50 dark:hover:bg-accent/30 disabled:opacity-50"
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
