"use client";

import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
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
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

function ActiveDuelsCard({ userId }: { userId?: string }) {
  const playerDuels = useQuery(
    api.duels.getPlayerDuels,
    userId ? { userId } : "skip"
  );

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
        <CardTitle>⚔️ Active Duels</CardTitle>
        <CardDescription>Your ongoing magical battles</CardDescription>
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
              <div
                key={duel._id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        duel.status === "WAITING_FOR_PLAYERS"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {duel.status === "WAITING_FOR_PLAYERS"
                        ? "Waiting"
                        : "Active"}
                    </Badge>
                    {duel.shortcode &&
                      duel.status === "WAITING_FOR_PLAYERS" && (
                        <code
                          className="text-xs px-1 py-0.5 bg-purple-100 text-purple-800 rounded cursor-pointer hover:bg-purple-200"
                          onClick={() => handleCopyShortcode(duel.shortcode!)}
                          title="Click to copy share link"
                        >
                          {duel.shortcode}
                        </code>
                      )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {typeof duel.numberOfRounds === "number"
                      ? `${duel.numberOfRounds} rounds`
                      : "To the death"}{" "}
                    • {duel.players.length} player
                    {duel.players.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Link href={`/duels/${duel._id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
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

export default function Dashboard() {
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const wizards = useQuery(
    api.wizards.getUserWizards,
    user?.id ? { userId: user.id } : "skip"
  );
  const deleteWizard = useMutation(api.wizards.deleteWizard);
  const regenerateIllustration = useMutation(
    api.wizards.regenerateIllustration
  );

  const handleDeleteWizard = async (wizardId: string) => {
    if (confirm("Are you sure you want to delete this wizard?")) {
      try {
        await deleteWizard({ wizardId: wizardId as unknown });
      } catch (error) {
        console.error("Failed to delete wizard:", error);
      }
    }
  };

  const handleRegenerateIllustration = async (wizardId: string) => {
    try {
      await regenerateIllustration({ wizardId: wizardId as unknown });
    } catch (error) {
      console.error("Failed to regenerate illustration:", error);
      alert("Failed to regenerate illustration. Please try again.");
    }
  };

  const totalWins =
    wizards?.reduce((sum, wizard) => sum + (wizard.wins || 0), 0) || 0;
  const totalLosses =
    wizards?.reduce((sum, wizard) => sum + (wizard.losses || 0), 0) || 0;
  const totalBattles = totalWins + totalLosses;
  const winRate =
    totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <nav className="flex items-center justify-between p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <Link href="/">
          <h1 className="text-2xl font-bold">AI Wizard Duel</h1>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-muted-foreground">
            Welcome, {user?.firstName || "Wizard"}!
          </span>
          <UserButton />
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Wizard Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your magical adventures and view your battle history
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚔️ Create Duel
              </CardTitle>
              <CardDescription>
                Start a new magical battle and wait for opponents
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
                👥 Join Duel
              </CardTitle>
              <CardDescription>
                Find an open duel and join the battle
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
                🧙‍♂️ Create Wizard
              </CardTitle>
              <CardDescription>Create a new wizard for battle</CardDescription>
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
              <CardTitle>📊 Your Stats</CardTitle>
              <CardDescription>Your overall magical prowess</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Wizards:</span>
                  <span className="font-bold">{wizards?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Battles:</span>
                  <span className="font-bold">{totalBattles}</span>
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

          <Card>
            <CardHeader>
              <CardTitle>🏆 Battle History</CardTitle>
              <CardDescription>Your recent magical encounters</CardDescription>
            </CardHeader>
            <CardContent>
              {totalBattles === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">
                    No battles yet. Create a wizard and start dueling!
                  </p>
                  <Link href="/duels">
                    <Button variant="outline">View All Duels</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-center text-muted-foreground mb-4">
                    Battle history coming soon...
                  </div>
                  <Link href="/duels">
                    <Button variant="outline" className="w-full">
                      View All Duels
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4">Your Wizards</h3>
          {wizards === undefined ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading wizards...</p>
            </div>
          ) : wizards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-6xl mb-4">🧙‍♂️</div>
                <h3 className="text-xl font-semibold mb-2">No wizards yet!</h3>
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
                <WizardCard
                  key={wizard._id}
                  wizard={wizard}
                  onDelete={handleDeleteWizard}
                  onRegenerateIllustration={handleRegenerateIllustration}
                  onDuel={(wizard) => {
                    // TODO: Implement duel functionality
                    console.log("Starting duel with:", wizard.name);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
