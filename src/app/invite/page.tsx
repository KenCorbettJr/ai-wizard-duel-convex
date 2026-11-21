import type { Metadata } from "next";
import { InvitePageClient } from "./InvitePageClient";

export const metadata: Metadata = {
  title: "Invite Friends",
  description:
    "Share your AI Wizard Duel invite link. When a friend joins and finishes their first duel, you both get bonus tokens.",
};

export default function InvitePage() {
  return <InvitePageClient />;
}
