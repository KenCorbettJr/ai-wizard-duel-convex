"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { WizardCard } from "@/components/WizardCard";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdDisplay } from "@/components/AdDisplay";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

import { CreditDisplay } from "@/components/CreditDisplay";
import { useState } from "react";
import { Wand2, Loader2, Plus, Scroll } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MyWizardsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { isProfileComplete, getProfileCompletionPrompt } =
    useProfileCompletion();
  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  const totalWins =
    wizards?.reduce(
      (sum: number, wizard: Doc<"wizards">) => sum + (wizard.wins || 0),
      0
    ) || 0;
  const totalLosses =
    wizards?.reduce(
      (sum: number, wizard: Doc<"wizards">) => sum + (wizard.losses || 0),
      0
    ) || 0;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Wizards</h1>
              <p className="text-muted-foreground">
                Manage your magical champions and view their achievements
              </p>
            </div>
            {user && (
              <Button
                onClick={handleCreateWizard}
                size="lg"
                className="flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create New Wizard
              </Button>
            )}
          </div>

          {/* Credit Display for Anonymous Users */}
          {!user && (
            <div className="mb-4 flex justify-center">
              <CreditDisplay />
            </div>
          )}

          {/* Ad Display for Anonymous Users */}
          {!user && (
            <div className="mb-6">
              <AdDisplay placement="WIZARD_PAGE" className="mb-4" />
            </div>
          )}

          {/* Registration Prompt for Anonymous Users */}
          {!user && (
            <div className="mb-6">
              <RegistrationPrompt context="premium_features" />
            </div>
          )}

          {/* Quick Stats and Campaign Link */}
          {wizards && wizards.length > 0 && (
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {wizards.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Wizards
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {totalWins}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Wins
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {totalDuels}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Duels
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {winRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Win Rate
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Mode Promotion */}
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                        <Scroll className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          Ready for Campaign Mode?
                        </h3>
                        <p className="text-muted-foreground">
                          Take your wizards through 10 challenging AI opponents
                          and earn powerful relics
                        </p>
                      </div>
                    </div>
                    <Link href="/campaign">
                      <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                        Start Campaign
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <ProfileCompletionPrompt
          open={showProfilePrompt}
          onOpenChange={setShowProfilePrompt}
          title={profilePrompt.title}
          message={profilePrompt.message}
          actionLabel={profilePrompt.actionLabel}
          onAction={profilePrompt.onAction}
          isSignInPrompt={!user}
        />

        {/* Wizards Grid */}
        {!user ? (
          // Show preview content for anonymous users
          <div className="space-y-6">
            <Card>
              <CardContent className="text-center py-16">
                <div className="mb-6">
                  <Wand2 className="h-20 w-20 mx-auto text-purple-600 mb-4" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  Discover Magical Wizards!
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create an account to build your own wizards and participate in
                  epic magical duels. Join thousands of players in the ultimate
                  wizard battle experience.
                </p>
                <div className="text-sm text-muted-foreground mb-4">
                  ✨ Create unlimited wizards • 🎮 Participate in duels • 🏆
                  Track your victories
                </div>
              </CardContent>
            </Card>
          </div>
        ) : wizards === undefined ? (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600 mb-4" />
            <p className="text-muted-foreground text-lg">
              Loading your wizards...
            </p>
          </div>
        ) : wizards.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="mb-6">
                <Wand2 className="h-20 w-20 mx-auto text-purple-600 mb-4" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">No wizards yet!</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first wizard to start your magical journey. Each
                wizard has unique abilities and can participate in epic duels.
              </p>
              <Button
                onClick={handleCreateWizard}
                size="lg"
                className="flex items-center gap-2"
              >
                <Wand2 className="h-5 w-5" />
                Create Your First Wizard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wizards.map((wizard: Doc<"wizards">) => (
              <WizardCard key={wizard._id} wizard={wizard} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
