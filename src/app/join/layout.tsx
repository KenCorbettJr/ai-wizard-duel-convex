import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Duel",
  description: "Join a magical duel using a shortcode and battle other wizards in AI Wizard Duel.",
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}