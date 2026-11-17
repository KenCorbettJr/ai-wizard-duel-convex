"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Swords } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function DuelAdminPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <PageHeader
            title="Duel Administration Dashboard"
            description="Monitor, manage, and analyze magical duels across the platform"
            icon={<Swords className="h-6 w-6" aria-hidden="true" />}
          />

          <div className="mb-6">
            <Card className="border-warning/40 bg-warning/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  Admin Access Notice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-warning text-sm">
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
