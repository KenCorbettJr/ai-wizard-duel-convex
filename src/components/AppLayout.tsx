"use client";

import { usePathname } from "next/navigation";
import { LeftSidebar } from "./LeftSidebar";
import { Navbar } from "./Navbar";
import { UserInitializer } from "./UserInitializer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <>
      {/* Initialize user record in database when authenticated */}
      <UserInitializer />

      {/* Don't show sidebar on home page */}
      {isHomePage ? (
        <>{children}</>
      ) : (
        <div className="min-h-screen">
          <LeftSidebar />

          {/* Main content area with left margin for desktop sidebar and top padding for mobile navbar */}
          <div className="md:ml-64 pt-[57px] md:pt-0">{children}</div>
        </div>
      )}
    </>
  );
}
