"use client";

import { usePathname } from "next/navigation";
import { LeftSidebar } from "./LeftSidebar";
import { UserInitializer } from "./UserInitializer";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  // The dev-only home preview renders the dashboard, which brings its own sidebar.
  const isHomePage = pathname === "/" || pathname === "/design/home";

  return (
    <>
      {/* Initialize user record in database when authenticated */}
      <UserInitializer />

      {/* Don't show sidebar on home page */}
      {isHomePage ? (
        <main id="main-content">{children}</main>
      ) : (
        <div className="min-h-screen">
          <LeftSidebar />

          {/* Main content area with left margin for desktop sidebar and top padding for mobile navbar */}
          <main
            id="main-content"
            className="md:ml-64 pt-[var(--app-navbar-h)] md:pt-0"
          >
            {children}
          </main>
        </div>
      )}
    </>
  );
}
