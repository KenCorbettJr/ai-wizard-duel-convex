"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Swords, Clock, UserCheck, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MagicVortex from "@/components/MagicVortex";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";

export default function DuelLobbyPage() {
  const { user } = useUser();
  const router = useRouter();
  const [pickedWizard, setPickedWizard] = useState<Id<"wizards"> | null>(null);
  const [selectedDuelType, setSelectedDuelType] = useState<
    number | "TO_THE_DEATH"
  >(3);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Queries
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");
  // Default to the first wizard so the form is ready to go.
  const selectedWizard = pickedWizard ?? wizards?.[0]?._id ?? null;
  const setSelectedWizard = setPickedWizard;
  const lobbyEntries = useQuery(api.duelLobby.getLobbyEntries);
  const userLobbyStatus = useQuery(api.duelLobby.getUserLobbyStatus);
  const userRecentDuel = useQuery(api.duelLobby.getUserRecentDuel);

  // Mutations
  const joinLobby = useMutation(api.duelLobby.joinLobby);
  const leaveLobby = useMutation(api.duelLobby.leaveLobby);

  // Redirect to duel when user gets matched and duel is created
  useEffect(() => {
    if (userRecentDuel && !userLobbyStatus) {
      // User has a recent duel but is no longer in lobby (was matched and removed)
      router.push(`/duels/${userRecentDuel}`);
    }
  }, [userRecentDuel, userLobbyStatus, router]);

  // Update current time every second for wait time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinLobby = async () => {
    if (!selectedWizard) {
      toast.error("Choose a wizard to send into the lobby");
      return;
    }

    try {
      await joinLobby({
        wizardId: selectedWizard,
        duelType: selectedDuelType,
      });
      // Success feedback will be shown via the lobby status update
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to join lobby",
      );
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await leaveLobby();
      // Success feedback will be shown via the lobby status update
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave lobby",
      );
    }
  };

  // Show loading state if user is being redirected to a duel
  if (userRecentDuel && !userLobbyStatus) {
    return (
      <MagicVortex className="min-h-screen">
        <div className="@container container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <RuneSpinner size="md" label="Loading…" />
              <h2 className="text-xl font-semibold mb-2 text-foreground font-display">
                Match Found!
              </h2>
              <p className="text-muted-foreground">
                Redirecting you to your duel...
              </p>
            </div>
          </div>
        </div>
      </MagicVortex>
    );
  }

  const formatWaitTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getDuelTypeLabel = (duelType: number | "TO_THE_DEATH") => {
    return duelType === "TO_THE_DEATH" ? "To the Death" : `${duelType} Rounds`;
  };

  return (
    <MagicVortex
      baseHue={280}
      baseSpeed={0.15}
      rangeSpeed={1.2}
      baseRadius={0.8}
      rangeRadius={1.5}
      className="min-h-screen"
    >
      <div className="@container container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <PageHeader
            title="Quick Match"
            description="Pick a wizard and we'll pair you with the next player who's ready."
            icon={<Users className="h-6 w-6" aria-hidden="true" />}
          />
        </div>

        <div className="grid grid-cols-1 @4xl:grid-cols-2 gap-6">
          {/* Join Lobby Section */}
          <Card className="bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                {userLobbyStatus ? "Finding your opponent" : "Find an opponent"}
              </CardTitle>
              <CardDescription>
                {userLobbyStatus
                  ? "Stay on this page or come back later. We'll take you to the duel when someone joins."
                  : "1 token, charged only when you're matched."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userLobbyStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Status</div>
                      <div className="text-sm text-muted-foreground">
                        {userLobbyStatus.status === "WAITING" &&
                          "Looking for opponent..."}
                        {userLobbyStatus.status === "MATCHED" &&
                          "Match found! Creating duel..."}
                      </div>
                    </div>
                    <Badge
                      variant={
                        userLobbyStatus.status === "WAITING"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {userLobbyStatus.status === "WAITING" && (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting
                        </>
                      )}
                      {userLobbyStatus.status === "MATCHED" && (
                        <>
                          <UserCheck className="h-3 w-3 mr-1" />
                          Matched
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Duel Type</div>
                      <div className="text-sm text-muted-foreground">
                        {getDuelTypeLabel(userLobbyStatus.duelType)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">Wait Time</div>
                      <div className="text-sm text-muted-foreground">
                        {formatWaitTime(currentTime - userLobbyStatus.joinedAt)}
                      </div>
                    </div>
                  </div>

                  {userLobbyStatus.status === "WAITING" && (
                    <Button
                      onClick={handleLeaveLobby}
                      variant="outline"
                      className="w-full"
                    >
                      Leave Lobby
                    </Button>
                  )}

                  {userLobbyStatus.status === "MATCHED" && (
                    <div className="text-center py-4">
                      <RuneSpinner size="md" label="Loading…" />
                      <p className="text-sm text-muted-foreground">
                        Creating your duel...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Wizard Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Your wizard
                    </label>
                    <Select
                      value={selectedWizard || ""}
                      onValueChange={(value) =>
                        setSelectedWizard(value as Id<"wizards">)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose your wizard" />
                      </SelectTrigger>
                      <SelectContent>
                        {wizards?.map((wizard) => (
                          <SelectItem key={wizard._id} value={wizard._id}>
                            <div className="flex items-center gap-2">
                              <Wand2 className="h-4 w-4" />
                              {wizard.name}
                              {wizard.wins || wizard.losses ? (
                                <span className="text-xs text-muted-foreground">
                                  {wizard.wins || 0}W · {wizard.losses || 0}L
                                </span>
                              ) : null}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duel Type Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Length
                    </label>
                    <Select
                      value={selectedDuelType.toString()}
                      onValueChange={(value) =>
                        setSelectedDuelType(
                          value === "TO_THE_DEATH"
                            ? "TO_THE_DEATH"
                            : parseInt(value),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Rounds</SelectItem>
                        <SelectItem value="5">5 Rounds</SelectItem>
                        <SelectItem value="TO_THE_DEATH">
                          To the Death
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleJoinLobby}
                    disabled={!selectedWizard || !wizards}
                    className="w-full"
                  >
                    <Swords className="h-4 w-4 mr-2" />
                    Find a match
                  </Button>

                  {wizards && wizards.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        You need a wizard to join the lobby
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/wizards/create">
                          <Wand2 className="h-4 w-4 mr-2" />
                          Create wizard
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Lobby */}
          <Card className="bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Current Lobby
              </CardTitle>
              <CardDescription>Players waiting for opponents</CardDescription>
            </CardHeader>
            <CardContent>
              {!lobbyEntries ? (
                <div className="text-center py-8">
                  <RuneSpinner size="md" label="Loading…" />
                  <p className="text-sm text-muted-foreground">
                    Loading lobby...
                  </p>
                </div>
              ) : lobbyEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Nobody&apos;s waiting right now
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Jump in and you&apos;ll be first in line. Or challenge a
                    friend from{" "}
                    <Link href="/duels/create" className="underline">
                      Start a duel
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lobbyEntries.map((entry, index) => (
                    <div key={entry._id}>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/12 rounded-full flex items-center justify-center">
                            <Wand2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              Player {index + 1}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getDuelTypeLabel(entry.duelType)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Waiting{" "}
                            {formatWaitTime(currentTime - entry.joinedAt)}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Waiting
                          </Badge>
                        </div>
                      </div>
                      {index < lobbyEntries.length - 1 && (
                        <div className="border-t my-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MagicVortex>
  );
}
