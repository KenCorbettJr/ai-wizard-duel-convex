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
      <div className="flex min-h-screen">
        <AdminNavigation />
        <div className="flex-1">{children}</div>
      </div>
    </SuperAdminOnly>
  );
}
