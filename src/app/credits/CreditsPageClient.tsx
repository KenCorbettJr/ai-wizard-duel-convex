"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCreditDisplay } from "@/components/ImageCreditDisplay";
import { CreditUsageHistory } from "@/components/CreditUsageHistory";
import { Coins, Crown } from "lucide-react";

export function CreditsPageClient() {
  const { user } = useUser();

  const handleUpgrade = () => {
    // Navigate to Clerk checkout for the specific plan
    const checkoutUrl = `https://checkout.clerk.com/plan/cplan_30kNnUiaUJomHTdauIDaRMldR5F`;
    window.open(checkoutUrl, "_blank");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Image Credits</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to view and manage your image generation credits.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
            <Coins className="h-8 w-8 text-yellow-500" />
            Image Credits
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Manage your image generation credits, watch ads to earn more, or
            upgrade to Premium for unlimited access.
          </p>
        </div>

        {/* Main Credit Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageCreditDisplay
            showHistory={true}
            onUpgradeClick={handleUpgrade}
          />
          <CreditUsageHistory />
        </div>

        {/* Premium Benefits */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Crown className="h-6 w-6" />
              Premium Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">
                  Unlimited Image Generation
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Generate as many AI images as you want for your duels
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">
                  Advanced Wizard Customization
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Access exclusive wizard appearances and magical schools
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">
                  Priority AI Processing
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Faster image generation and spell processing
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">
                  Ad-Free Experience
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Enjoy the game without any advertisements
                </p>
              </div>
            </div>
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium - $9.99/month
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
