"use client";

import {
  AuthKitProvider,
  Impersonation,
} from "@workos-inc/authkit-nextjs/components";
import type { ReactNode } from "react";

export function WorkOSProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider>
      <Impersonation />
      {children}
    </AuthKitProvider>
  );
}
