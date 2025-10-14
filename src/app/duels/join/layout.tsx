import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Duel",
  description:
    "Find an open magical duel and join the battle with your wizards in AI Wizard Duel.",
};

export default function JoinDuelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
