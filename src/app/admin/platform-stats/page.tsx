"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { DuelStatistics } from "@/components/DuelStatistics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, BarChart3, Globe } from "lucide-react";
import { useState } from "react";

export default function PlatformStatsPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">(
    "30d"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <SuperAdminOnly>
          {/* Header with controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Platform Statistics
              </h2>
              <p className="text-muted-foreground">
                Monitor platform-wide duel analytics and user engagement
              </p>
            </div>

            {/* Time range selector */}
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
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
            </div>
          </div>

          {/* Admin Access Notice */}
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  Super Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  You are viewing platform-wide statistics. This data includes
                  all user activity and should be handled with care. All access
                  is logged and monitored.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Statistics */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Global Platform Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DuelStatistics showGlobalStats={true} timeRange={timeRange} />
              </CardContent>
            </Card>
          </div>
        </SuperAdminOnly>
      </div>
    </div>
  );
}
