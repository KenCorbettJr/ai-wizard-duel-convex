"use client";

import { useAuth } from "@/hooks/useAuth";
import { DuelAdminDashboard } from "@/components/DuelAdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

export default function DuelAdminPage() {
  const { user } = useAuth();

  // In a real application, you would check if the user has admin privileges
  // For now, we'll show a warning about admin access
  const isAdmin =
    user?.publicMetadata?.role === "admin" ||
    process.env.NODE_ENV === "development";

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="text-center py-12">
              <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Authentication Required
              </h3>
              <p className="text-muted-foreground">
                Please sign in to access the admin dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground">
                You don&apos;t have permission to access the admin dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
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
                You are accessing the administrative dashboard. Please use these
                tools responsibly. All actions are logged and monitored.
              </p>
            </CardContent>
          </Card>
        </div>

        <DuelAdminDashboard />
      </div>
    </div>
  );
}
