"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageCreditDisplay } from "@/components/ImageCreditDisplay";
import { CreditUsageHistory } from "@/components/CreditUsageHistory";
import { Coins, Crown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import posthog from "posthog-js";

export function CreditsPageClient() {
  const { user } = useUser();

  const handleUpgrade = () => {
    posthog.capture("premium_upgrade_started");
    // Navigate to Clerk checkout for the specific plan
    const checkoutUrl = `https://checkout.clerk.com/plan/cplan_30kNnUiaUJomHTdauIDaRMldR5F`;
    window.open(checkoutUrl, "_blank");
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="Tokens"
            description="Please sign in to view and manage your tokens."
            icon={<Coins className="h-6 w-6" aria-hidden="true" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <PageHeader
          className="mb-0"
          title="Tokens"
          description="Manage your tokens, watch ads to earn more, or upgrade to Premium for unlimited access."
          icon={<Coins className="h-6 w-6" aria-hidden="true" />}
        />

        {/* Main Credit Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageCreditDisplay
            showHistory={true}
            onUpgradeClick={handleUpgrade}
          />
          <CreditUsageHistory />
        </div>

        {/* Premium Benefits */}
        <Card className="bg-arcane-soft border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Crown className="h-6 w-6" />
              Premium Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-primary font-display">
                  Unlimited Image Generation
                </h4>
                <p className="text-sm text-muted-foreground">
                  Generate as many AI images as you want for your duels
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary font-display">
                  Advanced Wizard Customization
                </h4>
                <p className="text-sm text-muted-foreground">
                  Access exclusive wizard appearances and magical schools
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary font-display">
                  Priority AI Processing
                </h4>
                <p className="text-sm text-muted-foreground">
                  Faster image generation and spell processing
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-primary font-display">
                  Ad-Free Experience
                </h4>
                <p className="text-sm text-muted-foreground">
                  Enjoy the game without any advertisements
                </p>
              </div>
            </div>
            <Button onClick={handleUpgrade} className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium - $9.99/month
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
