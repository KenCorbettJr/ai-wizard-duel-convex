"use client";

import { useState } from "react";
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
import {
  Users,
  Swords,
  Clock,
  Trophy,
  Loader2,
  UserCheck,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MagicVortex from "@/components/MagicVortex";

export default function DuelLobbyPage() {
  const { user } = useUser();
  const router = useRouter();
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    null
  );
  const [selectedDuelType, setSelectedDuelType] = useState<
    number | "TO_THE_DEATH"
  >(3);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Queries
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");
  const lobbyEntries = useQuery(api.duelLobby.getLobbyEntries);
  const userLobbyStatus = useQuery(api.duelLobby.getUserLobbyStatus);
  const lobbyStats = useQuery(api.duelLobby.getLobbyStats);
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
      alert("Please select a wizard");
      return;
    }

    try {
      await joinLobby({
        wizardId: selectedWizard,
        duelType: selectedDuelType,
      });
      // Success feedback will be shown via the lobby status update
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to join lobby");
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await leaveLobby();
      // Success feedback will be shown via the lobby status update
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to leave lobby");
    }
  };

  // Show loading state if user is being redirected to a duel
  if (userRecentDuel && !userLobbyStatus) {
    return (
      <MagicVortex className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-white font-[family-name:var(--font-cinzel)]">
                Match Found!
              </h2>
              <p className="text-gray-300">Redirecting you to your duel...</p>
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
      backgroundColor="rgba(15, 23, 42, 0.95)"
      className="min-h-screen"
    >
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/duels">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Duels
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 flex items-center gap-3 font-[family-name:var(--font-cinzel)]">
              <Users className="h-8 w-8 text-purple-600" />
              Duel Lobby
            </h1>
            <p className="text-muted-foreground text-lg">
              Find opponents and engage in magical combat
            </p>
          </div>
        </div>

        {/* Lobby Stats */}
        {lobbyStats && (
          <Card className="mb-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Lobby Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lobbyStats.totalWaiting}
                  </div>
                  <div className="text-sm text-muted-foreground">Waiting</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {lobbyStats.totalMatched}
                  </div>
                  <div className="text-sm text-muted-foreground">Matched</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {lobbyStats.averageWaitTime}s
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Wait</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Join Lobby Section */}
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                {userLobbyStatus ? "Lobby Status" : "Join Lobby"}
              </CardTitle>
              <CardDescription>
                {userLobbyStatus
                  ? "You are currently in the lobby"
                  : "Select a wizard and join the duel lobby"}
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
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-2" />
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
                      Select Wizard
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
                                  ({wizard.wins || 0}W/{wizard.losses || 0}
                                  L)
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
                      Duel Type
                    </label>
                    <Select
                      value={selectedDuelType.toString()}
                      onValueChange={(value) =>
                        setSelectedDuelType(
                          value === "TO_THE_DEATH"
                            ? "TO_THE_DEATH"
                            : parseInt(value)
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Rounds (Standard)</SelectItem>
                        <SelectItem value="5">5 Rounds (Extended)</SelectItem>
                        <SelectItem value="10">10 Rounds (Epic)</SelectItem>
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
                    <Users className="h-4 w-4 mr-2" />
                    Join Lobby
                  </Button>

                  {(!wizards || wizards.length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        You need a wizard to join the lobby
                      </p>
                      <Link href="/wizards">
                        <Button variant="outline" size="sm">
                          <Wand2 className="h-4 w-4 mr-2" />
                          Create Wizard
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Lobby */}
          <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
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
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Loading lobby...
                  </p>
                </div>
              ) : lobbyEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No players in lobby</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Be the first to join!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lobbyEntries.map((entry, index) => (
                    <div key={entry._id}>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                            <Wand2 className="h-4 w-4 text-purple-600" />
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
