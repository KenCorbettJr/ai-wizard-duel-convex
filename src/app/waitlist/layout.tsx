import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Request early access to AI Wizard Duel and be among the first to cast spells in AI-powered duels.",
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
