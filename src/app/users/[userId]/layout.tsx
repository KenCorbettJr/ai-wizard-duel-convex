import { ReactNode } from "react";

interface UserProfileLayoutProps {
  children: ReactNode;
}

export default function UserProfileLayout({
  children,
}: UserProfileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex-1">{children}</div>
    </div>
  );
}
