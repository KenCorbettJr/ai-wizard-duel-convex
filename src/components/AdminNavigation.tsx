"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Shield,
  BarChart3,
  Settings,
  Wrench,
  Swords,
  ArrowLeft,
  Menu,
  X,
  Crown,
  Users,
  Coins,
  Star,
  Eye,
  Flame,
  Clapperboard,
  HeartHandshake,
} from "lucide-react";

export interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  developmentOnly?: boolean;
}

interface AdminSidebarContentProps {
  pathname: string;
  setIsOpen: (open: boolean) => void;
}

const AdminSidebarContent = ({
  pathname,
  setIsOpen,
}: AdminSidebarContentProps) => (
  <div className="flex h-full flex-col">
    {/* Header */}
    <div className="border-b border-border px-4 py-3 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-linear-to-br from-primary to-gold p-2">
            <Crown className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Admin Panel</p>
            <p className="text-xs text-muted-foreground">Super Administrator</p>
          </div>
        </div>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="size-11 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-label="Close admin menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>

    {/* Navigation */}
    <nav
      aria-label="Admin"
      className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4"
    >
      <div className="space-y-1">
        {getVisibleAdminNavItems().map((item) => {
          const isActive = isAdminItemActive(item, pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors md:min-h-9",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground active:bg-accent",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.developmentOnly && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  DEV
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>

    {/* Return to User Experience */}
    <div className="flex items-center gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
      <Button
        asChild
        variant="outline"
        className="min-h-11 flex-1 justify-start md:min-h-9"
      >
        <Link href="/" onClick={() => setIsOpen(false)}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to the app
        </Link>
      </Button>
      <ThemeToggle />
    </div>
  </div>
);

/** Admin sections visible in this build (dev-only tools are hidden in production). */
export function getVisibleAdminNavItems() {
  return adminNavItems.filter(
    (item) => !item.developmentOnly || process.env.NODE_ENV !== "production",
  );
}

function isAdminItemActive(item: AdminNavItem, pathname: string) {
  if (item.href === "/admin") return pathname === "/admin";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Overview of every admin tool",
    icon: Shield,
  },
  {
    href: "/admin/platform-stats",
    label: "Platform Stats",
    description: "Platform-wide duel analytics and engagement",
    icon: BarChart3,
  },
  {
    href: "/admin/ai-costs",
    label: "AI Costs",
    description: "Estimated spend on AI text and images",
    icon: Coins,
  },
  {
    href: "/admin/users",
    label: "User Management",
    description: "Find users, grant tokens, review activity",
    icon: Users,
  },
  {
    href: "/admin/sponsorships",
    label: "Sponsorships",
    description: "Let a sponsor make duels free for a while",
    icon: HeartHandshake,
  },
  {
    href: "/admin/seasons",
    label: "Campaign Seasons",
    description: "Create and schedule campaign seasons",
    icon: Crown,
  },

  {
    href: "/admin/campaign-opponents",
    label: "Campaign Opponents",
    description: "Edit the campaign opponents and their art",
    icon: Settings,
  },
  {
    href: "/admin/duels",
    label: "Duel Management",
    description: "Search, inspect and cancel duels",
    icon: Swords,
  },
  {
    href: "/admin/most-watched",
    label: "Most Watched",
    description: "Duels with the biggest audiences",
    icon: Flame,
  },
  {
    href: "/admin/duel-ratings",
    label: "Duel Ratings",
    description: "How players rated finished duels",
    icon: Star,
  },
  {
    href: "/admin/teasers",
    label: "Duel Teasers",
    description: "Generate and publish duel teaser videos",
    icon: Clapperboard,
  },
  {
    href: "/admin/moderation",
    label: "The Watcher",
    description: "Moderation flags and reports",
    icon: Eye,
  },
  {
    href: "/admin/dev-tools",
    label: "Dev Tools",
    description: "Development utilities",
    icon: Wrench,
    developmentOnly: true,
  },
];

const desktopQuery = "(min-width: 768px)";
function subscribeDesktop(onChange: () => void) {
  const mql = window.matchMedia(desktopQuery);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
/** true on desktop widths, false on phones, null while rendering on the server. */
function useIsDesktop() {
  return useSyncExternalStore<boolean | null>(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => null,
  );
}

export function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  // Close the drawer whenever the route changes.
  const [openedOn, setOpenedOn] = useState(pathname);
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setIsOpen(false);
  }

  const triggerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const isDrawer = isOpen && isDesktop === false;

  // While the phone drawer is open it behaves as a modal dialog: focus moves
  // into it, Tab stays inside, Escape closes it, the page behind is inert and
  // doesn't scroll, and focus returns to the menu button afterwards.
  useEffect(() => {
    if (!isDrawer) return;
    const aside = asideRef.current;
    const trigger = triggerRef.current;
    const content = document.getElementById("admin-content");
    const focusables = () =>
      Array.from(
        aside?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    content?.setAttribute("inert", "");
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      content?.removeAttribute("inert");
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [isDrawer]);

  const current =
    getVisibleAdminNavItems().find((item) =>
      isAdminItemActive(item, pathname),
    ) ?? adminNavItems[0];
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Phone admin bar: pinned under the app top bar; scrolls away on short screens */}
      <div className="sticky top-[var(--app-navbar-h)] z-30 flex h-12 [@media(max-height:600px)]:static items-center gap-2 border-b border-border bg-background/95 px-2 backdrop-blur-md md:hidden">
        <Button
          ref={triggerRef}
          variant="ghost"
          className="h-11 min-w-0 flex-1 justify-start gap-2 px-2"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="admin-sidebar"
        >
          <Menu className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Admin
          </span>
          <span className="text-muted-foreground" aria-hidden="true">
            /
          </span>
          <CurrentIcon
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="truncate font-medium">{current.label}</span>
        </Button>
      </div>

      {/* Mobile overlay: above the app's top and tab bars */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        ref={asideRef}
        id="admin-sidebar"
        role={isDrawer ? "dialog" : undefined}
        aria-modal={isDrawer ? true : undefined}
        aria-label={isDrawer ? "Admin menu" : undefined}
        className={cn(
          "fixed left-0 top-0 z-[60] h-dvh w-[min(18rem,85vw)] border-r border-border bg-background transition-transform duration-300 ease-in-out md:z-40 md:h-full md:w-64",
          // Desktop: always visible. Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        // Off-screen on phones: keep its links out of the tab order
        inert={!isOpen ? isDesktop === false : undefined}
      >
        <AdminSidebarContent pathname={pathname} setIsOpen={setIsOpen} />
      </aside>
    </>
  );
}
