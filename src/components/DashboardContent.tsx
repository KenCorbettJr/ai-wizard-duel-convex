"use client";

import { useUser } from "@clerk/nextjs";
import { LeftSidebar } from "@/components/LeftSidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WizardCard } from "@/components/WizardCard";
import { CreateWizardModal } from "@/components/CreateWizardModal";
import { DuelListItem } from "@/components/DuelListItem";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Swords, Users, Wand2, BarChart3, Trophy, Loader2 } from "lucide-react";

function ActiveDuelsCard({ userId }: { userId?: string }) {
  const playerDuels = useQuery(api.duels.getPlayerDuels, userId ? {} : "skip");

  const activeDuels =
    playerDuels?.filter(
      (duel) =>
        duel.status === "WAITING_FOR_PLAYERS" || duel.status === "IN_PROGRESS"
    ) || [];

  const handleCopyShortcode = async (shortcode: string) => {
    const url = `${window.location.origin}/join/${shortcode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <Link href="/duels" className="group">
          <CardTitle className="flex items-center gap-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors cursor-pointer">
            <Swords className="h-5 w-5 text-orange-500" />
            Active Duels
            {activeDuels.length > 0 && (
              <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full">
                {activeDuels.length}
              </span>
            )}
          </CardTitle>
        </Link>
        <CardDescription>Your ongoing magical duels</CardDescription>
      </CardHeader>
      <CardContent>
        {activeDuels.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <Swords className="h-12 w-12 mx-auto text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mb-4">
              No active duels. Ready for battle?
            </p>
            <div className="space-y-2">
              <Link href="/duels/create" className="block">
                <Button size="sm" className="w-full">
                  Create Duel
                </Button>
              </Link>
              <Link href="/duels/join" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Join Existing
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDuels.slice(0, 3).map((duel) => (
              <DuelListItem
                key={duel._id}
                duel={duel}
                variant="dashboard"
                onCopyShortcode={handleCopyShortcode}
              />
            ))}
            {activeDuels.length > 3 && (
              <div className="text-center pt-2 border-t">
                <Link href="/duels">
                  <Button variant="outline" size="sm" className="mt-2">
                    View All ({activeDuels.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompletedDuelsCard({ userId }: { userId?: string }) {
  const completedDuels = useQuery(
    api.duels.getPlayerCompletedDuels,
    userId ? {} : "skip"
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <Link href="/duels" className="group">
          <CardTitle className="flex items-center gap-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors cursor-pointer">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Recent Battles
            {completedDuels && completedDuels.length > 0 && (
              <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full">
                {completedDuels.length}
              </span>
            )}
          </CardTitle>
        </Link>
        <CardDescription>Your completed magical encounters</CardDescription>
      </CardHeader>
      <CardContent>
        {!completedDuels || completedDuels.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mb-4">
              No completed duels yet. Start your first battle!
            </p>
            <Link href="/duels">
              <Button variant="outline" size="sm">
                Browse Duels
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {completedDuels.slice(0, 3).map((duel) => (
              <DuelListItem key={duel._id} duel={duel} variant="dashboard" />
            ))}
            {completedDuels.length > 3 && (
              <div className="text-center pt-2 border-t">
                <Link href="/duels">
                  <Button variant="outline" size="sm" className="mt-2">
                    View All ({completedDuels.length})
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardContent() {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  const totalWins =
    wizards?.reduce((sum, wizard) => sum + (wizard.wins || 0), 0) || 0;
  const totalLosses =
    wizards?.reduce((sum, wizard) => sum + (wizard.losses || 0), 0) || 0;
  const totalDuels = totalWins + totalLosses;
  const winRate =
    totalDuels > 0 ? Math.round((totalWins / totalDuels) * 100) : 0;

  return (
    <div className="min-h-screen">
      <LeftSidebar />

      {/* Main content area with left margin for desktop sidebar */}
      <div className="md:ml-64">
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                    Wizard Dashboard
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your magical adventures and view your duel history
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Link href="/leaderboard">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Leaderboard</span>
                        <span className="sm:hidden">Leaders</span>
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/duels/watch">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Swords className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Watch Duels</span>
                        <span className="sm:hidden">Watch</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Stats Card */}
            <Card className="mb-6 sm:mb-8">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <BarChart3 className="h-5 w-5" />
                  Your Magical Stats
                </CardTitle>
                <CardDescription className="text-sm">
                  Your overall magical prowess and achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {wizards?.length || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Wizards
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {totalDuels}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Total Duels
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                      {totalWins}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Victories
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {winRate}%
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Win Rate
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duels Section */}
            <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
                      Duels
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Your magical battles and encounters
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/duels" className="flex-1 sm:flex-none">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Swords className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">View All</span>
                        <span className="sm:hidden">All</span>
                      </Button>
                    </Link>
                    <Link href="/duels/join" className="flex-1 sm:flex-none">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Join Duel</span>
                        <span className="sm:hidden">Join</span>
                      </Button>
                    </Link>
                    <Link href="/duels/create" className="flex-1 sm:flex-none">
                      <Button size="sm" className="w-full sm:w-auto">
                        <Swords className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Create Duel</span>
                        <span className="sm:hidden">Create</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <ActiveDuelsCard userId={user?.id} />
                  <CompletedDuelsCard userId={user?.id} />
                </div>
              </CardContent>
            </Card>

            {/* Wizards Section */}
            <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                      <Wand2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      Your Wizards
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Manage your magical champions
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/wizards" className="flex-1 sm:flex-none">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        View All
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      className="flex-1 sm:flex-none w-full sm:w-auto"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Create Wizard
                    </Button>
                  </div>
                </div>

                {wizards === undefined ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                    <p className="text-muted-foreground mt-2">
                      Loading wizards...
                    </p>
                  </div>
                ) : wizards.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mb-4">
                        <Wand2 className="h-16 w-16 mx-auto text-purple-600" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        No wizards yet!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first wizard to start your magical journey.
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Create Your First Wizard
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {wizards.slice(0, 6).map((wizard) => (
                        <WizardCard key={wizard._id} wizard={wizard} />
                      ))}
                    </div>
                    {wizards.length > 6 && (
                      <div className="text-center mt-4 sm:mt-6">
                        <Link href="/wizards">
                          <Button variant="outline" size="sm">
                            View All Wizards ({wizards.length})
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <CreateWizardModal
              open={showCreateModal}
              onOpenChange={setShowCreateModal}
              onSuccess={() => {
                // Wizard list will automatically update due to Convex reactivity
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
