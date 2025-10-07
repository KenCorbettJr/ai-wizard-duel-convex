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
    <Card>
      <CardHeader>
        <Link href="/duels" className="group">
          <CardTitle className="flex items-center gap-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors cursor-pointer">
            <Swords className="h-5 w-5" />
            Active Duels
          </CardTitle>
        </Link>
        <CardDescription>Your ongoing magical duels</CardDescription>
      </CardHeader>
      <CardContent>
        {activeDuels.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              No active duels. Create one to get started!
            </p>
            <Link href="/duels/create">
              <Button variant="outline" size="sm">
                Create Duel
              </Button>
            </Link>
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
              <div className="text-center pt-2">
                <Link href="/duels">
                  <Button variant="outline" size="sm">
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
    <Card>
      <CardHeader>
        <Link href="/duels" className="group">
          <CardTitle className="flex items-center gap-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors cursor-pointer">
            <Trophy className="h-5 w-5" />
            Completed Duels
          </CardTitle>
        </Link>
        <CardDescription>Your recent magical encounters</CardDescription>
      </CardHeader>
      <CardContent>
        {!completedDuels || completedDuels.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              No duels yet. Create a wizard and start dueling!
            </p>
            <Link href="/duels">
              <Button variant="outline">View All Duels</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {completedDuels.slice(0, 3).map((duel) => (
              <DuelListItem key={duel._id} duel={duel} variant="dashboard" />
            ))}
            {completedDuels.length > 3 && (
              <div className="text-center pt-2">
                <Link href="/duels">
                  <Button variant="outline" size="sm">
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
          <div className="container mx-auto px-6 py-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Wizard Dashboard</h2>
              <p className="text-muted-foreground">
                Manage your magical adventures and view your duel history
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Create Duel
                  </CardTitle>
                  <CardDescription>
                    Start a new magical duel and wait for opponents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/duels/create">
                    <Button className="w-full">Create New Duel</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Join Duel
                  </CardTitle>
                  <CardDescription>
                    Find an open duel and join the fight
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/duels/join">
                    <Button variant="outline" className="w-full">
                      Join Existing Duel
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Create Wizard
                  </CardTitle>
                  <CardDescription>
                    Create a new wizard for dueling
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create New Wizard
                  </Button>
                </CardContent>
              </Card>
            </div>

            <CreateWizardModal
              open={showCreateModal}
              onOpenChange={setShowCreateModal}
              onSuccess={() => {
                // Wizard list will automatically update due to Convex reactivity
              }}
            />

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Your Stats
                  </CardTitle>
                  <CardDescription>
                    Your overall magical prowess
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Wizards:
                      </span>
                      <span className="font-bold">{wizards?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Duels:
                      </span>
                      <span className="font-bold">{totalDuels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Victories:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {totalWins}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Win Rate:</span>
                      <span className="font-bold">{winRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ActiveDuelsCard userId={user?.id} />

              <CompletedDuelsCard userId={user?.id} />
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Your Wizards</h3>
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
                    <Button onClick={() => setShowCreateModal(true)}>
                      Create Your First Wizard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wizards.map((wizard) => (
                    <WizardCard key={wizard._id} wizard={wizard} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
