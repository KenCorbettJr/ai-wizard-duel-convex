import { Metadata } from "next";
import { CreditsPageClient } from "./CreditsPageClient";

export const metadata: Metadata = {
  title: "Image Credits - AI Wizard Duel",
  description: "Manage your image generation credits and subscription",
};

export default function CreditsPage() {
  return <CreditsPageClient />;
}
