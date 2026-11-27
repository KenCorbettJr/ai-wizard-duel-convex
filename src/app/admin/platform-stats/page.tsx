"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { DuelStatistics } from "@/components/DuelStatistics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Globe } from "lucide-react";
import { AdminNotice } from "@/components/admin/AdminNotice";
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
            compactOnMobile
            className="mb-6 sm:mb-8"
            description="Monitor platform-wide duel analytics and user engagement"
            icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
            actions={
              <div className="flex w-full items-center gap-3 sm:w-auto">
                <Globe
                  className="h-5 w-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <Select
                  value={timeRange}
                  onValueChange={(value: "24h" | "7d" | "30d" | "all") =>
                    setTimeRange(value)
                  }
                >
                  <SelectTrigger
                    className="flex-1 sm:w-40 sm:flex-none"
                    aria-label="Time range"
                  >
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

          <AdminNotice>
            Platform-wide data covering all user activity. Access is logged.
          </AdminNotice>

          {/* Platform Statistics: rendered directly, no card-in-card on phones */}
          <section aria-label="Global platform analytics" className="mb-8">
            <DuelStatistics showGlobalStats={true} timeRange={timeRange} />
          </section>
        </SuperAdminOnly>
      </div>
    </div>
  );
}
