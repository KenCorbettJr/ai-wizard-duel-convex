"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield } from "lucide-react";

interface SuperAdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SuperAdminOnly({ children, fallback }: SuperAdminOnlyProps) {
  const { user } = useUser();

  // Check admin access using Convex query (more reliable than Clerk metadata)
  const adminAccess = useQuery(api.duels.checkAdminAccess);

  // Show loading state while checking access
  if (adminAccess === undefined) {
    return (
      fallback || (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Checking Permissions</h3>
            <p className="text-muted-foreground">
              Please wait while we verify your access...
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  // Show access denied message if user doesn't have permissions
  if (!adminAccess.hasAccess) {
    return (
      fallback || (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 dark:text-red-300 mb-4">
              You don&apos;t have permission to access this content.
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              Reason: {adminAccess.reason}
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              If you believe this is an error, please contact a system
              administrator.
            </p>
          </CardContent>
        </Card>
      )
    );
  }

  // User has super admin access, render children
  return <>{children}</>;
}
