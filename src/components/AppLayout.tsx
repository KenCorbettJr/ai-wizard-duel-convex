"use client";

import { usePathname } from "next/navigation";
import { LeftSidebar } from "./LeftSidebar";
import { SponsorBanner } from "./SponsorBanner";
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
        <main id="main-content">
          <SponsorBanner />
          {children}
        </main>
      ) : (
        <div className="min-h-screen">
          <LeftSidebar />

          {/* Left margin for the desktop sidebar; top/bottom padding for the phone top bar and tab bar */}
          <main
            id="main-content"
            className="md:ml-64 pt-[var(--app-navbar-h)] pb-[var(--app-bottomnav-h)] md:pt-0 md:pb-0"
          >
            <SponsorBanner />
            {children}
          </main>
        </div>
      )}
    </>
  );
}
