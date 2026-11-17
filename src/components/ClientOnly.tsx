"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

const subscribe = () => () => {};

/** Renders children only in the browser, avoiding hydration mismatches in third-party widgets. */
export function ClientOnly({
  children,
  label = "Loading…",
}: {
  children: ReactNode;
  label?: string;
}) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? <>{children}</> : <RuneSpinner label={label} />;
}
