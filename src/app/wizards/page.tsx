"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { WizardCard } from "@/components/WizardCard";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { WaitlistGuard } from "@/components/WaitlistGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdDisplay } from "@/components/AdDisplay";
import { RegistrationPrompt } from "@/components/RegistrationPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

import { CreditDisplay } from "@/components/CreditDisplay";
import { useState } from "react";
import { Wand2, Plus, Scroll } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

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
      0,
    ) || 0;
  const totalLosses =
    wizards?.reduce(
      (sum: number, wizard: Doc<"wizards">) => sum + (wizard.losses || 0),
      0,
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <PageHeader
            className="mb-0"
            title="My Wizards"
            description="Manage your magical champions and view their achievements"
            icon={<Wand2 className="h-6 w-6" aria-hidden="true" />}
            actions={
              user && (
                <WaitlistGuard>
                  <Button
                    onClick={handleCreateWizard}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Create New Wizard
                  </Button>
                </WaitlistGuard>
              )
            }
          />

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
                    <div className="text-2xl font-bold text-primary">
                      {wizards.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Wizards
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-success">
                      {totalWins}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Wins
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-info">
                      {totalDuels}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Duels
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-warning">
                      {winRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Win Rate
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Mode Promotion */}
              <Card className="bg-arcane-soft border-primary/30">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/12 rounded-full">
                        <Scroll className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground font-display">
                          Ready for Campaign Mode?
                        </h3>
                        <p className="text-muted-foreground">
                          Take your wizards through 10 challenging AI opponents
                          and earn powerful relics
                        </p>
                      </div>
                    </div>
                    <Button asChild>
                      <Link href="/campaign">Start Campaign</Link>
                    </Button>
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
            <EmptyState
              icon={<Wand2 className="size-7" aria-hidden="true" />}
              title="Discover Magical Wizards!"
              description="Create an account to build your own wizards and participate in
                  epic magical duels. Join thousands of players in the ultimate
                  wizard battle experience."
            />
          </div>
        ) : wizards === undefined ? (
          <div className="text-center py-12">
            <RuneSpinner size="md" label="Loading…" />
            <p className="text-muted-foreground text-lg">
              Loading your wizards...
            </p>
          </div>
        ) : wizards.length === 0 ? (
          <EmptyState
            icon={<Wand2 className="size-7" aria-hidden="true" />}
            title="No wizards yet!"
            description="Create your first wizard to start your magical journey. Each
                wizard has unique abilities and can participate in epic duels."
            action={
              <WaitlistGuard>
                <Button
                  onClick={handleCreateWizard}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-5 w-5" />
                  Create Your First Wizard
                </Button>
              </WaitlistGuard>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wizards.map((wizard: Doc<"wizards">) => (
              <WizardCard
                key={wizard._id}
                wizard={wizard}
                isUserWizard={true}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
