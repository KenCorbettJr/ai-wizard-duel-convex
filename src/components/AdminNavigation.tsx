"use client";

import { useState } from "react";
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
  Home,
  ArrowLeft,
  Menu,
  X,
  Crown,
  Users,
} from "lucide-react";

interface AdminNavItem {
  href: string;
  label: string;
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
  <div className="flex flex-col h-full">
    {/* Header */}
    <div className="p-6 border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-linear-to-br from-purple-600 to-pink-600">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Super Administrator</p>
          </div>
        </div>
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

    {/* Navigation */}
    <nav className="flex-1 p-4">
      <div className="space-y-2">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          // Skip dev-only items in production
          if (item.developmentOnly && process.env.NODE_ENV === "production") {
            return null;
          }

          return (
            <Link
              key={item.href}
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
              {item.developmentOnly && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                  DEV
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>

    {/* Return to User Experience */}
    <div className="p-4 border-t border-border space-y-3">
      <Link href="/">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setIsOpen(false)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to User Experience
        </Button>
      </Link>

      <div className="flex items-center justify-between">
        <ThemeToggle />
        <Link href="/">
          <Button variant="ghost" size="sm">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

const adminNavItems: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: Shield,
  },
  {
    href: "/admin/platform-stats",
    label: "Platform Stats",
    icon: BarChart3,
  },
  {
    href: "/admin/users",
    label: "User Management",
    icon: Users,
  },
  {
    href: "/admin/seasons",
    label: "Campaign Seasons",
    icon: Crown,
  },

  {
    href: "/admin/campaign-opponents",
    label: "Campaign Opponents",
    icon: Settings,
  },
  {
    href: "/admin/duels",
    label: "Duel Management",
    icon: Swords,
  },
  {
    href: "/admin/dev-tools",
    label: "Dev Tools",
    icon: Wrench,
    developmentOnly: true,
  },
];

export function AdminNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile hamburger button */}
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

      {/* Admin Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-background border-r border-border z-40 transition-transform duration-300 ease-in-out",
          "w-64",
          // Desktop: always visible
          "md:translate-x-0",
          // Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <AdminSidebarContent pathname={pathname} setIsOpen={setIsOpen} />
      </aside>
    </>
  );
}
