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

const adminFeatures = [
  {
    title: "Platform Statistics",
    description: "Monitor platform-wide duel analytics and user engagement",
    href: "/admin/platform-stats",
    icon: BarChart3,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
  },
  {
    title: "Campaign Opponents",
    description: "Create, edit, and manage the 10 campaign opponents",
    href: "/admin/campaign-opponents",
    icon: Settings,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950",
  },
  {
    title: "Dev Tools",
    description: "Development utilities and user management tools",
    href: "/admin/dev-tools",
    icon: Wrench,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    developmentOnly: true,
  },
  {
    title: "Duel Management",
    description: "Advanced duel administration and moderation tools",
    href: "/admin/duels",
    icon: Swords,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">
                  Super Admin Dashboard
                </h1>
                <p className="text-muted-foreground text-lg">
                  Administrative tools and platform management
                </p>
              </div>
            </div>

            {/* Admin Access Notice */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Super Administrator Access
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
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
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded">
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
                    <Link href={feature.href}>
                      <Button
                        className="w-full group-hover:bg-primary/90 transition-colors"
                        size="sm"
                      >
                        Access Tool
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Stats Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Quick Overview
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">--</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 24 hours
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
                    <Swords className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-bold">--</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently ongoing
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
                    <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
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
