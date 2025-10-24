"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Settings, Database, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function CampaignOpponentsPage() {
  // Queries
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Mutations
  const seedOpponents = useMutation(api.campaigns.seedCampaignOpponentsPublic);

  // Handle seeding opponents
  const handleSeedOpponents = async () => {
    try {
      const result = await seedOpponents({});
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to seed opponents: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                Campaign Opponents Management
              </h2>
              <p className="text-muted-foreground">
                Create, edit, and manage the 10 campaign opponents that players
                will face
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSeedOpponents}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Seed Default Opponents
              </Button>
            </div>
          </div>

          {/* Content */}
          {campaignOpponents === undefined ? (
            <Card>
              <CardContent className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">
                  Loading campaign opponents...
                </p>
              </CardContent>
            </Card>
          ) : campaignOpponents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No Campaign Opponents
                </h3>
                <p className="text-muted-foreground mb-6">
                  No campaign opponents have been created yet. Use the
                  &quot;Seed Default Opponents&quot; button to create the
                  standard 10 opponents.
                </p>
                <Button
                  onClick={handleSeedOpponents}
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  Seed Default Opponents
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Campaign Opponents ({campaignOpponents.length}/10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {campaignOpponents.length} opponents have been created
                  successfully.
                </p>
                <div className="mt-4 space-y-2">
                  {campaignOpponents
                    .sort(
                      (a, b) =>
                        (a.opponentNumber || 0) - (b.opponentNumber || 0)
                    )
                    .map((opponent) => (
                      <div
                        key={opponent._id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span>
                          #{opponent.opponentNumber} {opponent.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {opponent.difficulty}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </SuperAdminOnly>
      </div>
    </div>
  );
}
