"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, Swords, Users, Shield, Crown } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/PageHeader";
import { getVisibleAdminNavItems } from "@/components/AdminNavigation";

export default function AdminDashboardPage() {
  const platformStats = useQuery(api.adminUsers.getPlatformStats);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <PageHeader
              className="mb-0"
              title="Admin Dashboard"
              description="Administrative tools and platform management"
              icon={<Shield className="h-6 w-6" aria-hidden="true" />}
            />

            {/* Admin Access Notice */}
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              <Crown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium">Super administrator access.</span>{" "}
                All actions are logged.
              </span>
            </p>
          </div>

          {/* Admin tools: the whole card is the link */}
          <nav
            aria-label="Admin tools"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3"
          >
            {getVisibleAdminNavItems()
              .filter((item) => item.href !== "/admin")
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/40 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        {item.label}
                        {item.developmentOnly && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                            DEV
                          </span>
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
          </nav>

          {/* Quick Stats Section */}
          <div className="mt-8 sm:mt-12">
            <h2 className="font-display text-xl font-bold text-foreground mb-4 sm:text-2xl sm:mb-6">
              Quick Overview
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold">
                      {platformStats?.totalUsers ?? "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {platformStats?.activeUsers24h ?? "--"} active in last 24h
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Duels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-info" />
                    <span className="text-2xl font-bold">
                      {platformStats?.activeDuels ?? "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {platformStats?.totalDuels ?? "--"} total duels
                  </p>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-success rounded-full animate-pulse" />
                    <span className="text-sm font-medium">Operational</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All systems running
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </SuperAdminOnly>
      </div>
    </div>
  );
}
