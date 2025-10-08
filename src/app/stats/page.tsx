"use client";

import { useUser } from "@clerk/nextjs";
import { DuelStatistics } from "@/components/DuelStatistics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, User, Globe } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export default function StatsPage() {
  const { user } = useUser();
  const { isSuperAdmin } = useSuperAdmin();
  const [viewMode, setViewMode] = useState<"personal" | "global">("personal");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">(
    "30d"
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to view your duel statistics.
              </p>
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        {/* Header with controls in upper right */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Duel Statistics
            </h2>
            <p className="text-muted-foreground">
              Track your magical prowess
              {isSuperAdmin ? " and platform-wide duel analytics" : ""}
            </p>
          </div>

          {/* Compact controls in upper right */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("personal")}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Personal
              </Button>
              {isSuperAdmin && (
                <Button
                  variant={viewMode === "global" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("global")}
                  className="flex items-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Platform
                </Button>
              )}
            </div>

            {viewMode === "global" && isSuperAdmin && (
              <Select
                value={timeRange}
                onValueChange={(value: "24h" | "7d" | "30d" | "all") =>
                  setTimeRange(value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Statistics Display */}
        {viewMode === "personal" ? (
          <DuelStatistics userId={user.id} />
        ) : isSuperAdmin ? (
          <DuelStatistics showGlobalStats={true} timeRange={timeRange} />
        ) : (
          <DuelStatistics userId={user.id} />
        )}

        {/* Quick Actions */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Jump into action or explore more data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/duels/create">
                  <Button className="w-full">Create New Duel</Button>
                </Link>
                <Link href="/duels">
                  <Button variant="outline" className="w-full">
                    View All Duels
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
