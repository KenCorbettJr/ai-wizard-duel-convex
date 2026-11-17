"use client";

import { PricingTable } from "@clerk/nextjs";
import { useSyncExternalStore } from "react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

const subscribe = () => () => {};

/** Renders Clerk's PricingTable only on the client to avoid hydration mismatches. */
export function MountedPricingTable() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (!mounted) {
    return <RuneSpinner label="Loading plans…" className="py-12" />;
  }
  return (
    <PricingTable
      appearance={{
        elements: {
          pricingTable: "bg-transparent",
          pricingTableCard:
            "rune-card !border !border-gold/70 !bg-card text-card-foreground shadow-md !rounded-xl",
          pricingTableCardHeader: "text-center p-6 !border-border",
          pricingTableCardTitle:
            "!text-2xl !font-bold !font-display !text-center",
          pricingTableCardPrice: "text-3xl font-bold mt-2",
          pricingTableCardDescription: "text-muted-foreground mt-1",
          pricingTableCardFooter: "bg-transparent !border-t !border-border",
          pricingTableCardFeatures: "space-y-3 p-6",
          pricingTableCardFeaturesListItem:
            "flex items-center gap-3 [&_svg]:!text-primary",
          pricingTableCardFooterButton:
            "w-full mt-4 min-h-11 bg-arcane !text-white font-semibold",
        },
      }}
    />
  );
}
