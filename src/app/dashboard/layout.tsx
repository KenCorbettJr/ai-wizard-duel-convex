import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your magical adventures, view your wizards, and track your duel history in AI Wizard Duel.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}