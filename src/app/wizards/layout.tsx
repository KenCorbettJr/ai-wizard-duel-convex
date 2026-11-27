import type { Metadata } from "next";

export const metadata: Metadata = {
  // Keep the site suffix for child pages too (a plain string title here
  // would drop the root template for everything below).
  title: {
    default: "My Wizards",
    template: "%s | AI Wizard Duel",
  },
  description:
    "Manage your magical champions, view their stats, and track their duel history in AI Wizard Duel.",
};

export default function WizardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
