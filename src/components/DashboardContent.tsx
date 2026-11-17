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
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { DuelListItem } from "@/components/DuelListItem";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { MigrationNotification } from "@/components/MigrationNotification";
import { WaitlistGuard } from "@/components/WaitlistGuard";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Swords, Users, Wand2, BarChart3, Trophy } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

function ActiveDuelsCard({ userId }: { userId?: string }) {
  const playerDuels = useQuery(api.duels.getPlayerDuels, userId ? {} : "skip");

  const activeDuels =
    playerDuels?.filter(
      (duel) =>
        duel.status === "WAITING_FOR_PLAYERS" || duel.status === "IN_PROGRESS",
    ) || [];

  const handleCopyShortcode = async (shortcode: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${shortcode}`;
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
          <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors cursor-pointer">
            <Swords className="h-5 w-5 text-warning" />
            Active Duels
            {activeDuels.length > 0 && (
              <span className="bg-warning/15 text-warning text-xs px-2 py-1 rounded-full">
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
              <Button asChild size="sm" className="w-full">
                <Link href="/duels/lobby">
                  <Users className="h-4 w-4 mr-2" />
                  Quick Match
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/duels/create">Create Duel</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/duels/join">Join by Code</Link>
              </Button>
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
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/duels">View All ({activeDuels.length})</Link>
                </Button>
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
    userId ? {} : "skip",
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <Link href="/duels" className="group">
          <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors cursor-pointer">
            <Trophy className="h-5 w-5 text-gold" />
            Recent Battles
            {completedDuels && completedDuels.length > 0 && (
              <span className="bg-warning/15 text-warning text-xs px-2 py-1 rounded-full">
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
            <Button asChild variant="outline" size="sm">
              <Link href="/duels">Browse Duels</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {completedDuels.slice(0, 3).map((duel) => (
              <DuelListItem key={duel._id} duel={duel} variant="dashboard" />
            ))}
            {completedDuels.length > 3 && (
              <div className="text-center pt-2 border-t">
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href="/duels">View All ({completedDuels.length})</Link>
                </Button>
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
  const router = useRouter();
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [showMigrationNotification, setShowMigrationNotification] =
    useState(false);

  const {
    isLoaded,
    isSignedIn,
    isProfileComplete,
    getProfileCompletionPrompt,
  } = useProfileCompletion();
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  const totalWins =
    wizards?.reduce((sum, wizard) => sum + (wizard.wins || 0), 0) || 0;
  const totalLosses =
    wizards?.reduce((sum, wizard) => sum + (wizard.losses || 0), 0) || 0;
  const totalDuels = totalWins + totalLosses;
  const winRate =
    totalDuels > 0 ? Math.round((totalWins / totalDuels) * 100) : 0;

  const handleCreateWizard = () => {
    if (isProfileComplete) {
      router.push("/wizards/create");
    } else {
      setShowProfilePrompt(true);
    }
  };

  const profilePrompt = getProfileCompletionPrompt("create wizards");

  // Show migration notification for existing users without profiles
  useEffect(() => {
    if (
      isLoaded &&
      isSignedIn &&
      !isProfileComplete &&
      wizards !== undefined &&
      user
    ) {
      // Check if user has dismissed the notification before
      const dismissedKey = `migration-notification-dismissed-${user.id}`;
      const wasDismissed = localStorage.getItem(dismissedKey);

      if (!wasDismissed) {
        // Show notification after a delay
        const timer = setTimeout(() => {
          setShowMigrationNotification(true);
        }, 3000); // Show after 3 seconds

        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded, isSignedIn, isProfileComplete, wizards, user]);

  const handleDismissMigrationNotification = () => {
    setShowMigrationNotification(false);
    if (user) {
      // Remember that user dismissed this notification
      const dismissedKey = `migration-notification-dismissed-${user.id}`;
      localStorage.setItem(dismissedKey, "true");
    }
  };

  return (
    <div className="min-h-screen">
      <LeftSidebar />

      {/* Main content area with left margin for desktop sidebar */}
      <div className="md:ml-64">
        <div className="min-h-screen">
          <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-12">
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2 font-display">
                    Wizard Dashboard
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                    Manage your magical adventures and view your duel history
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <Link href="/leaderboard">
                        <Trophy className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Leaderboard</span>
                        <span className="sm:hidden">Leaders</span>
                      </Link>
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none"
                    >
                      <Link href="/duels/watch">
                        <Swords className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Watch Duels</span>
                        <span className="sm:hidden">Watch</span>
                      </Link>
                    </Button>
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
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {wizards?.length || 0}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Wizards
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-info">
                      {totalDuels}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Total Duels
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-success">
                      {totalWins}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Victories
                    </div>
                  </div>
                  <div className="text-center p-2 sm:p-0">
                    <div className="text-xl sm:text-2xl font-bold text-warning">
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
            <Card className="mb-6 sm:mb-8 bg-linear-to-r from-warning/50 to-destructive/50 border-warning/40">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-warning font-display">
                      <Swords className="h-5 w-5 sm:h-6 sm:w-6" />
                      Duels
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Your magical battles and encounters
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none w-full sm:w-auto"
                    >
                      <Link href="/duels">
                        <Swords className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">View All</span>
                        <span className="sm:hidden">All</span>
                      </Link>
                    </Button>
                    <WaitlistGuard>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                      >
                        <Link href="/duels/lobby">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Quick Match</span>
                          <span className="sm:hidden">Lobby</span>
                        </Link>
                      </Button>
                    </WaitlistGuard>
                    <WaitlistGuard>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                      >
                        <Link href="/duels/join">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Join Code</span>
                          <span className="sm:hidden">Join</span>
                        </Link>
                      </Button>
                    </WaitlistGuard>
                    <WaitlistGuard>
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                      >
                        <Link href="/duels/create">
                          <Swords className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">Create Duel</span>
                          <span className="sm:hidden">Create</span>
                        </Link>
                      </Button>
                    </WaitlistGuard>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <ActiveDuelsCard userId={user?.id} />
                  <CompletedDuelsCard userId={user?.id} />
                </div>
              </CardContent>
            </Card>

            {/* Wizards Section */}
            <Card className="mb-6 sm:mb-8 bg-arcane-soft border-primary/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-primary font-display">
                      <Wand2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      Your Wizards
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base">
                      Manage your magical champions
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-none w-full sm:w-auto"
                    >
                      <Link href="/wizards">
                        <Wand2 className="h-4 w-4 mr-2" />
                        View All
                      </Link>
                    </Button>
                    <WaitlistGuard>
                      <Button
                        size="sm"
                        onClick={handleCreateWizard}
                        className="flex-1 sm:flex-none w-full sm:w-auto"
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        Create Wizard
                      </Button>
                    </WaitlistGuard>
                  </div>
                </div>

                {wizards === undefined ? (
                  <div className="text-center py-8">
                    <RuneSpinner size="md" label="Loading…" />
                    <p className="text-muted-foreground mt-2">
                      Loading wizards...
                    </p>
                  </div>
                ) : wizards.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mb-4">
                        <Wand2 className="h-16 w-16 mx-auto text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 font-display">
                        No wizards yet!
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first wizard to start your magical journey.
                      </p>
                      <Button size="sm" onClick={handleCreateWizard}>
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
                        <Button asChild variant="outline" size="sm">
                          <Link href="/wizards">
                            View All Wizards ({wizards.length})
                          </Link>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <ProfileCompletionPrompt
              open={showProfilePrompt}
              onOpenChange={setShowProfilePrompt}
              title={profilePrompt.title}
              message={profilePrompt.message}
              actionLabel={profilePrompt.actionLabel}
              onAction={profilePrompt.onAction}
              isSignInPrompt={!user}
            />

            <MigrationNotification
              show={showMigrationNotification}
              onDismiss={handleDismissMigrationNotification}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
