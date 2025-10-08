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
import { Trophy, Medal, Award, Star, Zap, Crown } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
// Component for individual wizard card that fetches its own illustration
function WizardLeaderboardCard({
  wizard,
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
  };
}) {
  const illustrationUrl = useQuery(
    api.wizards.getIllustrationUrl,
    wizard.illustration ? { storageId: wizard.illustration } : "skip"
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Trophy className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
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

  return (
    <Card
      className={`transition-all hover:shadow-lg ${
        wizard.rank <= 3 ? "ring-2 ring-yellow-200 dark:ring-yellow-800" : ""
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          {/* Rank */}
          <div className="flex flex-col items-center min-w-[60px]">
            {getRankIcon(wizard.rank)}
            <Badge variant={getRankBadgeVariant(wizard.rank)} className="mt-1">
              #{wizard.rank}
            </Badge>
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
              {wizard.isAIPowered && (
                <Badge variant="secondary" className="text-xs">
                  AI
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {wizard.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-col sm:flex-row gap-4 text-center">
            <div className="min-w-[80px]">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatWinRate(wizard.winRate)}
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {wizard.wins || 0}
              </div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {wizard.losses || 0}
              </div>
              <div className="text-xs text-muted-foreground">Losses</div>
            </div>
            <div className="min-w-[60px]">
              <div className="text-lg font-semibold text-foreground">
                {wizard.totalDuels}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
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

  const leaderboard = useQuery(api.wizards.getWizardLeaderboard, {
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
        {leaderboard.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Wizards Found</h3>
              <p className="text-muted-foreground">
                No wizards meet the current filter criteria. Try lowering the
                minimum duels requirement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((wizard) => (
              <WizardLeaderboardCard key={wizard._id} wizard={wizard} />
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
              <div className="grid md:grid-cols-3 gap-4">
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
                <Link href="/stats">
                  <button className="w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    View Stats
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
