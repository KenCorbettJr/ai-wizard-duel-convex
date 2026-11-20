"use client";

import { useEffect, useRef, useState } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LobbyStatusIndicator } from "@/components/LobbyStatusIndicator";
import { CreditDisplay } from "@/components/CreditDisplay";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { cn } from "@/lib/utils";
import {
  Home,
  Swords,
  Eye,
  Users,
  Wand2,
  Menu,
  X,
  Plus,
  Crown,
  Coins,
  User,
  Scroll,
  Shield,
  ShieldCheck,
} from "lucide-react";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  showStatus?: boolean;
  requiresSuperAdmin?: boolean;
}

interface SidebarGroup {
  title?: string;
  items: SidebarItem[];
  requiresSuperAdmin?: boolean;
}

interface SidebarContentProps {
  pathname: string;
  getSidebarGroups: () => SidebarGroup[];
  setIsOpen: (open: boolean) => void;
}

const SidebarContent = ({
  pathname,
  getSidebarGroups,
  setIsOpen,
}: SidebarContentProps) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center"
          onClick={() => setIsOpen(false)}
        >
          <span className="block whitespace-nowrap text-lg font-bold tracking-wide font-display text-gold-gradient">
            AI Wizard Duel
          </span>
        </Link>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden min-w-11"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>

    <nav aria-label="Main" className="flex-1 overflow-y-auto p-4">
      <div className="space-y-6">
        {getSidebarGroups().map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.title && (
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                if (item.requiresAuth) {
                  return (
                    <Show when="signed-in" key={item.href}>
                      <li>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-11",
                            isActive
                              ? "bg-primary/15 text-foreground shadow-[inset_3px_0_0_var(--gold)]"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent",
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4", isActive && "text-gold")}
                            aria-hidden="true"
                          />
                          <span className="flex-1">{item.label}</span>
                          {item.showStatus && <LobbyStatusIndicator />}
                          {item.href === "/credits" && (
                            <CreditDisplay showLabel={false} size="sm" />
                          )}
                        </Link>
                      </li>
                    </Show>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-11",
                        isActive
                          ? "bg-primary/15 text-foreground shadow-[inset_3px_0_0_var(--gold)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4", isActive && "text-gold")}
                        aria-hidden="true"
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.showStatus && <LobbyStatusIndicator />}
                      {item.href === "/credits" && (
                        <Show when="signed-in">
                          <CreditDisplay showLabel={false} size="sm" />
                        </Show>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>

    {/* Bottom section with theme toggle and user controls */}
    <div className="p-4 border-t border-border">
      <div className="flex items-center justify-between">
        <ThemeToggle />
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton>
            <Button size="sm" className="min-h-11">
              Sign In
            </Button>
          </SignInButton>
        </Show>
      </div>
    </div>
  </div>
);

const sidebarGroups: SidebarGroup[] = [
  // General navigation
  {
    items: [
      {
        href: "/",
        label: "Home",
        icon: Home,
      },
      {
        href: "/profile",
        label: "Profile",
        icon: User,
        requiresAuth: true,
      },
      {
        href: "/credits",
        label: "Tokens",
        icon: Coins,
        requiresAuth: true,
      },
    ],
  },
  // Wizard management
  {
    title: "Wizards",
    items: [
      {
        href: "/leaderboard",
        label: "Leaderboard",
        icon: Crown,
      },
      {
        href: "/wizards",
        label: "My Wizards",
        icon: Wand2,
        requiresAuth: true,
      },
      {
        href: "/wizards/create",
        label: "Add Wizard",
        icon: Plus,
        requiresAuth: true,
      },
      {
        href: "/campaign",
        label: "Campaign",
        icon: Scroll,
        requiresAuth: true,
      },
    ],
  },
  // Duel management
  {
    title: "Duels",
    items: [
      {
        href: "/duels/watch",
        label: "Watch Duels",
        icon: Eye,
      },
      {
        href: "/duels",
        label: "My Duels",
        icon: Swords,
        requiresAuth: true,
      },
      {
        href: "/duels/lobby",
        label: "Quick Match",
        icon: Users,
        requiresAuth: true,
        showStatus: true,
      },
      {
        href: "/duels/create",
        label: "Create Duel",
        icon: Plus,
        requiresAuth: true,
      },
      {
        href: "/duels/join",
        label: "Join by Code",
        icon: Users,
        requiresAuth: true,
      },
    ],
  },
  {
    items: [
      {
        href: "/rules",
        label: "Rules & Safety",
        icon: ShieldCheck,
      },
    ],
  },
];

interface LeftSidebarProps {
  className?: string;
}

export function LeftSidebar({ className }: LeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mobileBarRef = useRef<HTMLDivElement>(null);

  // Publish the mobile bar's real height so sticky headers and the drawer sit
  // flush beneath it, whatever the text size or font scaling on the device.
  useEffect(() => {
    const el = mobileBarRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      const h =
        el.offsetParent === null ? 0 : el.getBoundingClientRect().height;
      if (h > 0) root.style.setProperty("--app-navbar-h", `${Math.ceil(h)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pathname = usePathname();
  const { isSuperAdmin } = useSuperAdmin();

  const toggleSidebar = () => setIsOpen(!isOpen);

  // Get sidebar groups with conditional super admin section
  const getSidebarGroups = (): SidebarGroup[] => {
    const groups = [...sidebarGroups];

    // Add Super Admin section if user is super admin
    if (isSuperAdmin) {
      groups.push({
        title: "Super Admin",
        requiresSuperAdmin: true,
        items: [
          {
            href: "/admin",
            label: "Admin Dashboard",
            icon: Shield,
            requiresAuth: true,
            requiresSuperAdmin: true,
          },
        ],
      });
    }

    return groups;
  };

  return (
    <>
      {/* Mobile navbar - always visible on mobile */}
      <div
        ref={mobileBarRef}
        className="md:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-border"
      >
        <div className="flex items-center justify-between px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="min-w-11"
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center"
            onClick={() => setIsOpen(false)}
          >
            <span className="block whitespace-nowrap text-base font-bold tracking-wide font-display text-gold-gradient">
              AI Wizard Duel
            </span>
          </Link>
          <div className="w-11" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-navigation"
        className={cn(
          "fixed left-0 h-full bg-sidebar border-r border-border z-40 transition-transform duration-300 ease-in-out",
          "w-64",
          // Desktop: always visible, starts at top
          "md:top-0",
          // Mobile: starts below navbar, slide in/out
          "top-[var(--app-navbar-h)] h-[calc(100dvh-var(--app-navbar-h))] md:top-0 md:h-full",
          // Desktop: always visible
          "md:translate-x-0",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className,
        )}
      >
        <SidebarContent
          pathname={pathname}
          getSidebarGroups={getSidebarGroups}
          setIsOpen={setIsOpen}
        />
      </aside>
    </>
  );
}
