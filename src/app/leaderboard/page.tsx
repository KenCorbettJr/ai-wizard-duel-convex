"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIdDisplay } from "@/components/UserIdDisplay";
import { CampaignRelicBadge } from "@/components/CampaignRelicBadge";
import { Trophy, Medal, Award, Star, Zap, Crown } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
// Component for individual wizard card that fetches its own illustration
function WizardLeaderboardCard({
  wizard,
  period,
}: {
  wizard: {
    _id: string;
    name: string;
    description: string;
    illustration?: string;
    isAIPowered?: boolean;
    wins?: number;
    losses?: number;
    winRate: number;
    totalDuels: number;
    rank: number;
    ownerUserId?: string;
    ownerDisplayName?: string;
    periodWins: number;
    periodLosses: number;
    periodWinRate: number;
    periodTotalDuels: number;
    hasCompletionRelic: boolean;
    effectiveLuckScore: number;
  };
  period: "all" | "week" | "month";
}) {
  const rawIllustrationUrl = useQuery(
    api.wizards.getIllustrationUrl,
    wizard.illustration ? { storageId: wizard.illustration } : "skip"
  );
  const illustrationUrl = rawIllustrationUrl;

  const getRankIcon = (rank: number, period: "all" | "week" | "month") => {
    const isTimePeriod = period !== "all";
    switch (rank) {
      case 1:
        return (
          <Crown
            className={`h-6 w-6 ${isTimePeriod ? "text-yellow-400 animate-pulse" : "text-yellow-500"}`}
          />
        );
      case 2:
        return (
          <Trophy
            className={`h-6 w-6 ${isTimePeriod ? "text-gray-300" : "text-gray-400"}`}
          />
        );
      case 3:
        return (
          <Medal
            className={`h-6 w-6 ${isTimePeriod ? "text-amber-500" : "text-amber-600"}`}
          />
        );
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "default" as const;
      case 2:
        return "secondary" as const;
      case 3:
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  const formatWinRate = (winRate: number) => {
    return `${(winRate * 100).toFixed(1)}%`;
  };

  const getCardStyling = (rank: number, period: "all" | "week" | "month") => {
    const isTimePeriod = period !== "all";
    if (rank <= 3) {
      const baseRing = "ring-2";
      if (isTimePeriod) {
        switch (rank) {
          case 1:
            return `${baseRing} ring-yellow-300 dark:ring-yellow-600 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950`;
          case 2:
            return `${baseRing} ring-gray-300 dark:ring-gray-600 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950`;
          case 3:
            return `${baseRing} ring-amber-300 dark:ring-amber-600 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950`;
        }
      }
      return `${baseRing} ring-yellow-200 dark:ring-yellow-800`;
    }
    return "";
  };

  return (
    <Card
      className={`transition-all hover:shadow-lg ${getCardStyling(wizard.rank, period)}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="flex flex-col items-center min-w-[60px]">
            {getRankIcon(wizard.rank, period)}
            <Badge variant={getRankBadgeVariant(wizard.rank)} className="mt-1">
              #{wizard.rank}
            </Badge>
            {period !== "all" && wizard.rank === 1 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-1">
                {period === "week" ? "Week" : "Month"} Champion
              </div>
            )}
          </div>

          {/* Wizard Avatar */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={illustrationUrl || undefined} alt={wizard.name} />
            <AvatarFallback className="text-lg font-bold">
              {wizard.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Wizard Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/wizards/${wizard._id}`}
                className="text-xl font-bold text-foreground hover:text-primary transition-colors truncate"
              >
                {wizard.name}
              </Link>
              <div className="flex gap-1">
                {wizard.hasCompletionRelic && (
                  <CampaignRelicBadge
                    hasRelic={wizard.hasCompletionRelic}
                    effectiveLuckScore={wizard.effectiveLuckScore}
                    className="text-xs"
                  />
                )}
                {wizard.isAIPowered && (
                  <Badge variant="secondary" className="text-xs">
                    AI
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-1">
              {wizard.description}
            </p>
            {wizard.ownerUserId && (
              <UserIdDisplay
                userId={wizard.ownerUserId}
                displayName={wizard.ownerDisplayName}
                size="sm"
                showAvatar={false}
              />
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row gap-4 text-center">
            <div className="min-w-[80px]">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatWinRate(
                  period === "all" ? wizard.winRate : wizard.periodWinRate
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {period === "all"
                  ? "Win Rate"
                  : `${period === "week" ? "Weekly" : "Monthly"} Win Rate`}
              </div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {period === "all" ? wizard.wins || 0 : wizard.periodWins}
              </div>
              <div className="text-xs text-muted-foreground">
                {period === "all"
                  ? "Wins"
                  : `${period === "week" ? "Weekly" : "Monthly"} Wins`}
              </div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {period === "all" ? wizard.losses || 0 : wizard.periodLosses}
              </div>
              <div className="text-xs text-muted-foreground">
                {period === "all"
                  ? "Losses"
                  : `${period === "week" ? "Weekly" : "Monthly"} Losses`}
              </div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {period === "all" ? wizard.totalDuels : wizard.periodTotalDuels}
              </div>
              <div className="text-xs text-muted-foreground">
                {period === "all"
                  ? "Total"
                  : `${period === "week" ? "Weekly" : "Monthly"} Total`}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeaderboardPage() {
  const [minDuels, setMinDuels] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [period, setPeriod] = useState<"all" | "week" | "month">("all");

  const leaderboard = useQuery(api.wizards.getWizardLeaderboardByPeriod, {
    period,
    limit,
    minDuels,
  });

  if (leaderboard === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-6 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Wizard Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg">
            The most powerful wizards ranked by their win rate and battle
            prowess
          </p>
        </div>

        {/* Time Period Selection */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPeriod("all")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Trophy className="h-4 w-4" />
              All Time
            </button>
            <button
              onClick={() => setPeriod("month")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === "month"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Medal className="h-4 w-4" />
              This Month
            </button>
            <button
              onClick={() => setPeriod("week")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === "week"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Crown className="h-4 w-4" />
              This Week
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Minimum Duels</CardTitle>
              <CardDescription>
                Only show wizards with at least this many duels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={minDuels.toString()}
                onValueChange={(value) => setMinDuels(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1+ Duels</SelectItem>
                  <SelectItem value="3">3+ Duels</SelectItem>
                  <SelectItem value="5">5+ Duels</SelectItem>
                  <SelectItem value="10">10+ Duels</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Results Limit</CardTitle>
              <CardDescription>Number of wizards to display</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        {!leaderboard || leaderboard.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Wizards Found</h3>
              <p className="text-muted-foreground">
                No wizards meet the current filter criteria for{" "}
                {period === "all" ? "all time" : `this ${period}`}. Try lowering
                the minimum duels requirement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((wizard) => (
              <WizardLeaderboardCard
                key={wizard._id}
                wizard={wizard}
                period={period}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Ready to Compete?
              </CardTitle>
              <CardDescription>
                Create your own wizard and climb the leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Link href="/wizards">
                  <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    My Wizards
                  </button>
                </Link>
                <Link href="/duels/create">
                  <button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Start Duel
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
