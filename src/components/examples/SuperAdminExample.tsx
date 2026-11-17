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
          <Card className="border-border bg-muted">
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
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Database className="h-5 w-5" />
              Database Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">
              Dangerous database operations that can affect the entire system.
            </p>
            <Button variant="destructive">Execute Database Migration</Button>
          </CardContent>
        </Card>
      </SuperAdminOnly>
    </div>
  );
}
