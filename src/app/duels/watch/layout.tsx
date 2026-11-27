import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch Duels",
};

export default function WatchDuelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
