"use client";

import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { AdminNavigation } from "@/components/AdminNavigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuperAdminOnly>
      {/* Admin pages show other players' details, so replay never records them */}
      <div className="flex min-h-screen ph-no-capture">
        <AdminNavigation />
        <div className="flex-1">{children}</div>
      </div>
    </SuperAdminOnly>
  );
}
