import { Metadata } from "next";
import { CreditsPageClient } from "./CreditsPageClient";

export const metadata: Metadata = {
  title: "Tokens - AI Wizard Duel",
  description: "Manage your tokens and subscription",
};

export default function CreditsPage() {
  return <CreditsPageClient />;
}
