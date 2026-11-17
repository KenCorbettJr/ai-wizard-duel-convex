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
import { PageHeader } from "@/components/PageHeader";

export default function PlatformStatsPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "all">(
    "30d",
  );

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          {/* Header with controls */}
          <PageHeader
            title="Platform Statistics"
            description="Monitor platform-wide duel analytics and user engagement"
            icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
            actions={
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
            }
          />

          {/* Admin Access Notice */}
          <div className="mb-6">
            <Card className="border-warning/40 bg-warning/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Super Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-warning text-sm">
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
