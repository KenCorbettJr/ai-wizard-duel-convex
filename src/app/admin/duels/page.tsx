"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Swords } from "lucide-react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { PageHeader } from "@/components/PageHeader";

export default function DuelAdminPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <PageHeader
            title="Duel Management"
            compactOnMobile
            className="mb-6 sm:mb-8"
            description="Monitor, manage, and analyze magical duels across the platform"
            icon={<Swords className="h-6 w-6" aria-hidden="true" />}
          />

          <AdminNotice>
            Use these tools responsibly. All actions are logged.
          </AdminNotice>

          <AdminDashboard />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
