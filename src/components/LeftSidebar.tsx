"use client";

import { Show, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { LobbyStatusIndicator } from "@/components/LobbyStatusIndicator";
import { CreditDisplay } from "@/components/CreditDisplay";
import { MobileNav } from "@/components/navigation/MobileNav";
import { getVisibleGroups } from "@/components/navigation/navConfig";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useInvitePerk } from "@/hooks/useInvitePerk";
import { cn } from "@/lib/utils";

interface LeftSidebarProps {
  className?: string;
}

/**
 * App navigation: a fixed sidebar on desktop, and on phones a slim top bar,
 * a bottom tab bar and a "More" sheet (see MobileNav).
 */
export function LeftSidebar({ className }: LeftSidebarProps) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const hasInvitePerk = useInvitePerk();
  const groups = getVisibleGroups({
    isSignedIn: !!isSignedIn,
    isSuperAdmin: !!isSuperAdmin,
    hasInvitePerk,
  });

  return (
    <>
      <MobileNav />

      <aside
        id="main-navigation"
        className={cn(
          "fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-border bg-sidebar md:block",
          className,
        )}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-6">
            <Link href="/" className="inline-flex min-h-11 items-center">
              <span className="block whitespace-nowrap font-display text-lg font-bold tracking-wide text-gold-gradient">
                AI Wizard Duel
              </span>
            </Link>
          </div>

          <nav aria-label="Main" className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {groups.map((group, groupIndex) => (
                <div key={group.title ?? groupIndex}>
                  {group.title && (
                    <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </p>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                              isActive
                                ? "bg-primary/15 text-foreground shadow-[inset_3px_0_0_var(--gold)]"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between">
              <ThemeToggle />
              <Show when="signed-in">
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  <UserButton />
                </div>
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
      </aside>
    </>
  );
}
