import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Duels",
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
