"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignInButton, UserButton, useAuth, useClerk } from "@clerk/nextjs";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "convex/react";
import { ChevronLeft, LogIn, LogOut, Menu, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CreditDisplay } from "@/components/CreditDisplay";
import { LobbyStatusIndicator } from "@/components/LobbyStatusIndicator";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useInvitePerk } from "@/hooks/useInvitePerk";
import { cn } from "@/lib/utils";
import { startTopLoader } from "./TopLoader";
import {
  getBackFallback,
  getVisibleGroups,
  isTopLevelRoute,
  signedInTabs,
  signedOutTabs,
  type TabItem,
} from "./navConfig";

const tabClass =
  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50";

function ActiveIndicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gold"
    />
  );
}

/** Small dot on the Quick Match tab while the player is queued or matched. */
function LobbyDot() {
  const status = useQuery(api.duelLobby.getUserLobbyStatus);
  if (!status) return null;
  return (
    <span
      className={cn(
        "absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar",
        status.status === "MATCHED"
          ? "bg-success"
          : "animate-pulse bg-gold motion-reduce:animate-none",
      )}
    >
      <span className="sr-only">
        {status.status === "MATCHED" ? "(matched)" : "(in lobby)"}
      </span>
    </span>
  );
}

function Tab({
  tab,
  active,
  onSelect,
}: {
  tab: TabItem;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        tabClass,
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {active && <ActiveIndicator />}
      <span
        className={cn(
          "relative flex items-center justify-center",
          tab.primary &&
            "h-8 w-12 rounded-full bg-primary/15 ring-1 ring-primary/30",
          tab.primary && active && "bg-primary/25 ring-gold/60",
        )}
      >
        <Icon
          className={cn("h-5 w-5", active && "text-gold")}
          aria-hidden="true"
        />
        {tab.showStatus && <LobbyDot />}
      </span>
      <span className="max-w-full truncate">{tab.label}</span>
    </Link>
  );
}

/**
 * Phone navigation: slim top bar (logo, tokens, account), bottom tab bar for
 * the main areas, and a "More" bottom sheet with everything else. Hidden at
 * md and up, where the sidebar takes over.
 */
/**
 * Tracks the in-app pages visited this session, so "back" can tell whether
 * popping browser history stays inside the app or would leave it (a page
 * opened from a shared link has nothing in-app to go back to).
 */
function useInAppHistory(pathname: string) {
  const stack = useRef<string[]>([]);
  useEffect(() => {
    const s = stack.current;
    if (s.length >= 2 && s[s.length - 2] === pathname) s.pop();
    else if (s[s.length - 1] !== pathname) s.push(pathname);
  }, [pathname]);
  return () => stack.current.length > 1;
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const canGoBack = useInAppHistory(pathname);
  const showBack = !isTopLevelRoute(pathname);
  const goBack = () => {
    startTopLoader();
    if (canGoBack()) router.back();
    else router.push(getBackFallback(pathname));
  };
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { isSuperAdmin } = useSuperAdmin();
  const hasInvitePerk = useInvitePerk();
  const [sheetOpen, setSheetOpen] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);

  // Publish the top bar's real height so sticky headers sit flush beneath it,
  // whatever the text size or font scaling on the device.
  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      root.style.setProperty("--app-navbar-h", `${Math.ceil(h)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The tab just tapped, highlighted right away while its page loads.
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Close the sheet whenever the route changes (link taps, back button).
  const [sheetPath, setSheetPath] = useState(pathname);
  if (sheetPath !== pathname) {
    setSheetPath(pathname);
    setSheetOpen(false);
    setPendingTab(null);
  }

  const tabs = isSignedIn ? signedInTabs : signedOutTabs;
  const tabHrefs = tabs.map((t) => t.href);
  const sheetGroups = getVisibleGroups({
    isSignedIn: !!isSignedIn,
    isSuperAdmin: !!isSuperAdmin,
    hasInvitePerk,
    exclude: tabHrefs,
  });
  const activeTab =
    tabs.find((t) => t.href === pendingTab) ??
    tabs.find((t) => t.isActive(pathname));
  const moreActive = isLoaded && !activeTab && !sheetOpen;

  return (
    <>
      {/* Top bar */}
      <div
        ref={topBarRef}
        className="fixed inset-x-0 top-0 z-50 border-b border-border bg-sidebar md:hidden"
      >
        <div
          className={cn(
            "flex min-h-14 items-center justify-between gap-2 py-1.5 pr-4",
            showBack ? "pl-1" : "pl-4",
          )}
        >
          <div className="flex min-w-0 items-center">
            {showBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Back"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
            )}
            <Link href="/" className="inline-flex min-h-11 items-center">
              <span className="block whitespace-nowrap font-display text-base font-bold tracking-wide text-gold-gradient">
                AI Wizard Duel
              </span>
            </Link>
          </div>
          {/* Signed-out visitors get Sign In as a tab instead. */}
          {isSignedIn && (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Link
                href="/credits"
                aria-label="Tokens. Get more"
                className="inline-flex min-h-11 items-center"
              >
                <CreditDisplay showLabel={false} size="sm" />
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        aria-label="Main"
        className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="flex h-[var(--app-bottomnav-bar-h)] items-stretch">
          {isLoaded && (
            <>
              {tabs.map((tab) => (
                <Tab
                  key={tab.href}
                  tab={tab}
                  active={tab === activeTab}
                  onSelect={() =>
                    setPendingTab(tab.isActive(pathname) ? null : tab.href)
                  }
                />
              ))}
              {!isSignedIn && (
                <SignInButton>
                  <button
                    type="button"
                    className={cn(tabClass, "text-muted-foreground")}
                  >
                    <LogIn className="h-5 w-5" aria-hidden="true" />
                    <span>Sign In</span>
                  </button>
                </SignInButton>
              )}
            </>
          )}

          <DialogPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
            <DialogPrimitive.Trigger asChild>
              <button
                type="button"
                className={cn(
                  tabClass,
                  moreActive || sheetOpen
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {moreActive && <ActiveIndicator />}
                <Menu
                  className={cn("h-5 w-5", moreActive && "text-gold")}
                  aria-hidden="true"
                />
                <span>More</span>
              </button>
            </DialogPrimitive.Trigger>

            <MoreSheet
              groups={sheetGroups}
              pathname={pathname}
              isSignedIn={!!isSignedIn}
              onClose={() => setSheetOpen(false)}
              onSignOut={() => signOut({ redirectUrl: "/" })}
            />
          </DialogPrimitive.Root>
        </div>
      </nav>
    </>
  );
}

interface MoreSheetProps {
  groups: ReturnType<typeof getVisibleGroups>;
  pathname: string;
  isSignedIn: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

function MoreSheet({
  groups,
  pathname,
  isSignedIn,
  onClose,
  onSignOut,
}: MoreSheetProps) {
  // Drag the handle area down to dismiss.
  const [dragY, setDragY] = useState(0);
  const [dragStart, setDragStart] = useState<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Leave taps on the close button alone; pointer capture would eat its click.
    if ((e.target as HTMLElement).closest("button")) return;
    setDragStart(e.clientY);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart === null) return;
    setDragY(Math.max(0, e.clientY - dragStart));
  };
  const onPointerEnd = () => {
    if (dragStart === null) return;
    setDragStart(null);
    if (dragY > 80) onClose();
    setDragY(0);
  };

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 md:hidden" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-border bg-sidebar shadow-2xl outline-none md:hidden",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom duration-300 motion-reduce:animate-none",
          dragStart === null && "transition-transform",
        )}
      >
        <div
          className="shrink-0 touch-none select-none px-4 pb-2 pt-2"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          <div
            aria-hidden="true"
            className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-muted-foreground/30"
          />
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="font-display text-lg font-bold">
              Menu
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>
        </div>

        <nav
          aria-label="More"
          className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4"
        >
          {groups.map((group, i) => (
            <section key={group.title ?? i}>
              {group.title && (
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </h3>
              )}
              <ul className="grid grid-cols-2 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border-gold/50 bg-primary/15 text-foreground"
                            : "border-border bg-card/60 text-foreground active:bg-accent",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-gold" : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 leading-tight">
                          {item.label}
                        </span>
                        {item.showStatus && <LobbyStatusIndicator />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Theme</span>
          </div>
          {isSignedIn && (
            <Button variant="ghost" className="min-h-11" onClick={onSignOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
