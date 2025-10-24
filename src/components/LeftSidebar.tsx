"use client";

import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
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
  BarChart3,
  Coins,
  User,
  Scroll,
  Settings,
  Shield,
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
        label: "Credits",
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
];

interface LeftSidebarProps {
  className?: string;
}

export function LeftSidebar({ className }: LeftSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <Link href="/" onClick={() => setIsOpen(false)}>
            <h1 className="text-xl font-bold text-foreground">
              AI Wizard Duel
            </h1>
          </Link>
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-6">
          {getSidebarGroups().map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  if (item.requiresAuth) {
                    return (
                      <SignedIn key={item.href}>
                        <li>
                          <Link
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            {item.showStatus && <LobbyStatusIndicator />}
                            {item.href === "/credits" && (
                              <CreditDisplay showLabel={false} size="sm" />
                            )}
                          </Link>
                        </li>
                      </SignedIn>
                    );
                  }

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.showStatus && <LobbyStatusIndicator />}
                        {item.href === "/credits" && (
                          <SignedIn>
                            <CreditDisplay showLabel={false} size="sm" />
                          </SignedIn>
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
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button - hide when sidebar is open */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden fixed top-6 left-4 z-50"
          onClick={toggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-background border-r border-border z-40 transition-transform duration-300 ease-in-out",
          "w-64",
          // Desktop: always visible
          "md:translate-x-0",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
