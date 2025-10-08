"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useSuperAdmin() {
  const adminAccess = useQuery(api.duels.checkAdminAccess);

  return {
    isSuperAdmin: adminAccess?.hasAccess ?? false,
    isLoading: adminAccess === undefined,
    reason: adminAccess?.reason,
  };
}
