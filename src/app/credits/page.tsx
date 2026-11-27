import { Suspense } from "react";
import { Metadata } from "next";
import { CreditsPageClient } from "./CreditsPageClient";
import { RuneSpinner } from "@/components/ui/rune-spinner";

export const metadata: Metadata = {
  title: "Tokens",
  description: "Buy tokens for AI Wizard Duel. One token enters one duel.",
};

export default function CreditsPage() {
  return (
    <Suspense
      fallback={<RuneSpinner label="Loading tokens…" className="py-12" />}
    >
      <CreditsPageClient />
    </Suspense>
  );
}
