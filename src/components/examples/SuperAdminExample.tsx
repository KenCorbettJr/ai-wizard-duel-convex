"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Users, Database } from "lucide-react";

/**
 * Example component showing different ways to use SuperAdminOnly
 */
export function SuperAdminExample() {
  return (
    <div className="space-y-6">
      {/* Example 1: Basic usage with default fallback */}
      <SuperAdminOnly>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Configure system-wide settings and preferences.
            </p>
            <Button>Open Settings</Button>
          </CardContent>
        </Card>
      </SuperAdminOnly>

      {/* Example 2: Usage with custom fallback */}
      <SuperAdminOnly
        fallback={
          <Card className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                User management is only available to super administrators.
              </p>
            </CardContent>
          </Card>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Manage user accounts, roles, and permissions.
            </p>
            <Button>Manage Users</Button>
          </CardContent>
        </Card>
      </SuperAdminOnly>

      {/* Example 3: Usage with null fallback (completely hidden) */}
      <SuperAdminOnly fallback={null}>
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <Database className="h-5 w-5" />
              Database Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">
              Dangerous database operations that can affect the entire system.
            </p>
            <Button variant="destructive">Execute Database Migration</Button>
          </CardContent>
        </Card>
      </SuperAdminOnly>
    </div>
  );
}
