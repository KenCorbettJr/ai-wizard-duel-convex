import type { Metadata } from "next";

export const metadata: Metadata = {
  // Keep the site suffix for child pages too (a plain string title here
  // would drop the root template for everything below).
  title: { default: "Duels", template: "%s | AI Wizard Duel" },
  description:
    "Join existing magical duels or create your own epic battles between wizards in AI Wizard Duel.",
};

export default function DuelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
