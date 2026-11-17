"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Settings,
  BarChart3,
  Wrench,
  Swords,
  Users,
  Shield,
  ArrowRight,
  Crown,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "@/components/PageHeader";

const adminFeatures = [
  {
    title: "Platform Statistics",
    description: "Monitor platform-wide duel analytics and user engagement",
    href: "/admin/platform-stats",
    icon: BarChart3,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    title: "User Management",
    description: "View and manage users, grant credits, and monitor activity",
    href: "/admin/users",
    icon: Users,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Campaign Opponents",
    description: "Create, edit, and manage the 10 campaign opponents",
    href: "/admin/campaign-opponents",
    icon: Settings,
    color: "text-primary",
    bgColor: "bg-primary/8",
  },
  {
    title: "Dev Tools",
    description: "Development utilities and user management tools",
    href: "/admin/dev-tools",
    icon: Wrench,
    color: "text-warning",
    bgColor: "bg-warning/10",
    developmentOnly: true,
  },
  {
    title: "Duel Management",
    description: "Advanced duel administration and moderation tools",
    href: "/admin/duels",
    icon: Swords,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
];

export default function AdminDashboardPage() {
  const platformStats = useQuery(api.adminUsers.getPlatformStats);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="mb-8">
            <PageHeader
              className="mb-0"
              title="Super Admin Dashboard"
              description="Administrative tools and platform management"
              icon={<Shield className="h-6 w-6" aria-hidden="true" />}
            />

            {/* Admin Access Notice */}
            <Card className="border-warning/40 bg-warning/10">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-warning">
                      Super Administrator Access
                    </p>
                    <p className="text-sm text-warning">
                      You have full administrative privileges. All actions are
                      logged and monitored.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminFeatures.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card
                  key={feature.href}
                  className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      {feature.developmentOnly && (
                        <span className="px-2 py-1 text-xs font-medium bg-muted text-foreground rounded">
                          Dev Only
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                    <Button
                      asChild
                      className="w-full group- transition-colors"
                      size="sm"
                    >
                      <Link href={feature.href}>
                        Access Tool
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Stats Section */}
          <div className="mt-12">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              Quick Overview
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
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

              <Card>
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
