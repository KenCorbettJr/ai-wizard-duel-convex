import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Match",
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
