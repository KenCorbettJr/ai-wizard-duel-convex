import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Duel",
  description:
    "Set up a new magical battle and challenge other wizards to an epic duel in AI Wizard Duel.",
};

export default function CreateDuelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
