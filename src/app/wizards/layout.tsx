import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Wizards",
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
