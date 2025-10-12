"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Loader2 } from "lucide-react";

type AdPlacement = "WIZARD_PAGE" | "DUEL_PAGE" | "CREDIT_REWARD";

interface AdAnalyticsDashboardProps {
  className?: string;
}

export function AdAnalyticsDashboard({
  className = "",
}: AdAnalyticsDashboardProps) {
  const wizardPageMetrics = useQuery(api.adService.getAdPerformanceMetrics, {
    placement: "WIZARD_PAGE" as AdPlacement,
    timeframe: 7,
  });

  const duelPageMetrics = useQuery(api.adService.getAdPerformanceMetrics, {
    placement: "DUEL_PAGE" as AdPlacement,
    timeframe: 7,
  });

  const creditRewardMetrics = useQuery(api.adService.getAdPerformanceMetrics, {
    placement: "CREDIT_REWARD" as AdPlacement,
    timeframe: 7,
  });

  const isLoading =
    wizardPageMetrics === undefined ||
    duelPageMetrics === undefined ||
    creditRewardMetrics === undefined;

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600 mb-4" />
          <p className="text-muted-foreground">Loading ad analytics...</p>
        </div>
      </div>
    );
  }

  const totalRevenue =
    (wizardPageMetrics?.revenue || 0) +
    (duelPageMetrics?.revenue || 0) +
    (creditRewardMetrics?.revenue || 0);

  const totalImpressions =
    (wizardPageMetrics?.impressions || 0) +
    (duelPageMetrics?.impressions || 0) +
    (creditRewardMetrics?.impressions || 0);

  const totalClicks =
    (wizardPageMetrics?.clicks || 0) +
    (duelPageMetrics?.clicks || 0) +
    (creditRewardMetrics?.clicks || 0);

  const overallCTR =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold mb-2">Ad Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Performance metrics for the last 7 days
        </p>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${(totalRevenue / 100).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalImpressions.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Impressions
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalClicks.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Clicks</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {overallCTR.toFixed(2)}%
            </div>
            <div className="text-sm text-muted-foreground">Overall CTR</div>
          </CardContent>
        </Card>
      </div>

      {/* Placement-specific Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wizard Page Ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue:</span>
              <span className="font-semibold">
                ${((wizardPageMetrics?.revenue || 0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Impressions:
              </span>
              <span className="font-semibold">
                {(wizardPageMetrics?.impressions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Clicks:</span>
              <span className="font-semibold">
                {(wizardPageMetrics?.clicks || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CTR:</span>
              <span className="font-semibold">
                {(wizardPageMetrics?.ctr || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Duel Page Ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue:</span>
              <span className="font-semibold">
                ${((duelPageMetrics?.revenue || 0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Impressions:
              </span>
              <span className="font-semibold">
                {(duelPageMetrics?.impressions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Clicks:</span>
              <span className="font-semibold">
                {(duelPageMetrics?.clicks || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CTR:</span>
              <span className="font-semibold">
                {(duelPageMetrics?.ctr || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reward Ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Revenue:</span>
              <span className="font-semibold">
                ${((creditRewardMetrics?.revenue || 0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Impressions:
              </span>
              <span className="font-semibold">
                {(creditRewardMetrics?.impressions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Completions:
              </span>
              <span className="font-semibold">
                {(creditRewardMetrics?.completions || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Completion Rate:
              </span>
              <span className="font-semibold">
                {(creditRewardMetrics?.completionRate || 0).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
