"use client";

import { usePathname } from "next/navigation";
import { LeftSidebar } from "./LeftSidebar";
import { Navbar } from "./Navbar";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  // Don't show sidebar on home page
  if (isHomePage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <LeftSidebar />

      {/* Main content area with left margin for desktop sidebar */}
      <div className="md:ml-64">
        {/* Show navbar only on mobile for hamburger menu space */}
        <Navbar className="md:hidden pl-16" />
        {children}
      </div>
    </div>
  );
}
