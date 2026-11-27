"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";
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
import { Trophy, Medal, Award, Star, Crown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Show, SignInButton } from "@clerk/nextjs";
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
  const illustrationUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    // @ts-expect-error - "skip" is a valid Convex query parameter
    wizard.illustration ? { storageId: wizard.illustration } : "skip",
  );

  const getRankIcon = (rank: number, period: "all" | "week" | "month") => {
    const isTimePeriod = period !== "all";
    switch (rank) {
      case 1:
        return (
          <Crown
            className={`h-6 w-6 ${isTimePeriod ? "text-gold animate-rune-pulse" : "text-gold"}`}
          />
        );
      case 2:
        return (
          <Trophy
            className={`h-6 w-6 ${isTimePeriod ? "text-muted-foreground" : "text-muted-foreground"}`}
          />
        );
      case 3:
        return (
          <Medal
            className={`h-6 w-6 ${isTimePeriod ? "text-warning" : "text-warning"}`}
          />
        );
      default:
        return <Star className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return "legendary" as const;
      case 2:
        return "secondary" as const;
      case 3:
        return "gold" as const;
      default:
        return "outline" as const;
    }
  };

  const formatWinRate = (winRate: number) => {
    return `${Math.round(winRate * 100)}%`;
  };

  const getCardStyling = (rank: number) => {
    switch (rank) {
      case 1:
        return "ring-2 ring-gold/70 bg-gold/10";
      case 2:
        return "ring-2 ring-primary/40 bg-primary/5";
      case 3:
        return "ring-2 ring-warning/40 bg-warning/5";
      default:
        return "";
    }
  };

  return (
    <Card className={`sparkle-hover ${getCardStyling(wizard.rank)}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Rank */}
          <div className="flex flex-col items-center min-w-[48px]">
            {getRankIcon(wizard.rank, period)}
            <Badge variant={getRankBadgeVariant(wizard.rank)} className="mt-1">
              #{wizard.rank}
            </Badge>
            {period !== "all" && wizard.rank === 1 && (
              <div className="text-xs text-gold-foreground font-medium mt-1">
                {period === "week" ? "Week" : "Month"} Champion
              </div>
            )}
          </div>

          {/* Wizard Avatar */}
          <Avatar className="h-12 w-12 shrink-0 sm:h-16 sm:w-16">
            <AvatarImage src={illustrationUrl || undefined} alt={wizard.name} />
            <AvatarFallback className="text-lg font-bold">
              {wizard.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Wizard Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <Link
                href={`/wizards/${wizard._id}`}
                className="font-display text-lg font-bold leading-tight text-foreground hover:text-primary transition-colors line-clamp-2 sm:text-xl"
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

          {/* Stats: win rate up top, record underneath */}
          <div className="shrink-0 text-right">
            <div
              className={`text-xl font-bold sm:text-2xl ${
                (period === "all" ? wizard.winRate : wizard.periodWinRate) >=
                0.5
                  ? "text-success"
                  : "text-foreground"
              }`}
            >
              {formatWinRate(
                period === "all" ? wizard.winRate : wizard.periodWinRate,
              )}
            </div>
            <div className="whitespace-nowrap text-xs text-muted-foreground">
              {period === "all" ? wizard.wins || 0 : wizard.periodWins}W ·{" "}
              {period === "all" ? wizard.losses || 0 : wizard.periodLosses}L
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

  const periods = [
    { value: "all", label: "All Time", icon: Trophy },
    { value: "month", label: "This Month", icon: Medal },
    { value: "week", label: "This Week", icon: Crown },
  ] as const;

  return (
    <div className="container mx-auto px-4 pt-10 pb-8 sm:px-6 sm:py-12">
      <PageHeader
        title="Wizard Leaderboard"
        description="The most powerful wizards, ranked by win rate and battle prowess."
        icon={<Trophy className="h-6 w-6" aria-hidden="true" />}
      />

      {/* Toolbar: period tabs + filters in one compact row */}
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="group"
          aria-label="Time period"
          className="flex flex-wrap gap-2"
        >
          {periods.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={period === value ? "default" : "outline"}
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
            >
              <Icon aria-hidden="true" />
              {label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Select
            value={minDuels.toString()}
            onValueChange={(value) => setMinDuels(parseInt(value))}
          >
            <SelectTrigger aria-label="Minimum duels" className="sm:w-44">
              <SelectValue>{`${minDuels}+ Duels`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+ Duels</SelectItem>
              <SelectItem value="3">3+ Duels</SelectItem>
              <SelectItem value="5">5+ Duels</SelectItem>
              <SelectItem value="10">10+ Duels</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={limit.toString()}
            onValueChange={(value) => setLimit(parseInt(value))}
          >
            <SelectTrigger
              aria-label="Number of wizards to show"
              className="sm:w-36"
            >
              <SelectValue>{`Top ${limit}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">Top 25</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
              <SelectItem value="100">Top 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {leaderboard === undefined ? (
        <RuneSpinner
          size="lg"
          label="Consulting the rankings…"
          className="py-20"
        />
      ) : leaderboard.length === 0 ? (
        <EmptyState
          icon={<Crown className="size-7" aria-hidden="true" />}
          title="No wizard has earned their stripes yet"
          description={`Nobody has met these requirements ${
            period === "all" ? "of all time" : `this ${period}`
          }. Lower the minimum duels, or be the first to claim the throne.`}
          action={
            <Button asChild>
              <Link href="/duels/create">Start a duel</Link>
            </Button>
          }
        />
      ) : (
        <ol className="space-y-4">
          {leaderboard.map((wizard) => (
            <li key={wizard._id}>
              <WizardLeaderboardCard wizard={wizard} period={period} />
            </li>
          ))}
        </ol>
      )}

      {/* Only visitors need the pitch; players already have the nav. */}
      <Show when="signed-out">
        <section className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gold" aria-hidden="true" />
                Ready to Compete?
              </CardTitle>
              <CardDescription>
                Create your own wizard and climb the leaderboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignInButton>
                <Button>Sign in to compete</Button>
              </SignInButton>
            </CardContent>
          </Card>
        </section>
      </Show>
    </div>
  );
}
