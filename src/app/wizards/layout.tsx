import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wizards",
  description: "View wizard profiles, stats, and duel history in AI Wizard Duel.",
};

export default function WizardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}