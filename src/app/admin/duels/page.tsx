"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function DuelAdminPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <SuperAdminOnly>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Duel Administration Dashboard
            </h2>
            <p className="text-muted-foreground">
              Monitor, manage, and analyze magical duels across the platform
            </p>
          </div>

          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  Admin Access Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 dark:text-orange-300 text-sm">
                  You are accessing the super admin dashboard. Please use these
                  tools responsibly. All actions are logged and monitored.
                </p>
              </CardContent>
            </Card>
          </div>

          <AdminDashboard />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
