"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { WizardCard } from "@/components/WizardCard";
import { CreateWizardModal } from "@/components/CreateWizardModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Wand2, Loader2, Plus } from "lucide-react";

export default function MyWizardsPage() {
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
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create New Wizard
            </Button>
          </div>

          {/* Quick Stats */}
          {wizards && wizards.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <CreateWizardModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSuccess={() => {
            // Wizard list will automatically update due to Convex reactivity
          }}
        />

        {/* Wizards Grid */}
        {wizards === undefined ? (
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
                onClick={() => setShowCreateModal(true)}
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
            {wizards.map((wizard) => (
              <WizardCard key={wizard._id} wizard={wizard} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
