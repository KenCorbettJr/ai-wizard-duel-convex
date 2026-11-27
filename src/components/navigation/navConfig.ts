import type { ComponentType } from "react";
import {
  Home,
  Swords,
  Eye,
  Wand2,
  Crown,
  Coins,
  User,
  Scroll,
  Shield,
  ShieldCheck,
  Gift,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  /** Only for players with the invite perk (they've bought tokens). */
  requiresInvitePerk?: boolean;
  showStatus?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "Play",
    items: [
      { href: "/", label: "Home", icon: Home },
      {
        href: "/campaign",
        label: "Campaign",
        icon: Scroll,
        requiresAuth: true,
      },
      {
        href: "/duels",
        label: "Duels",
        icon: Swords,
        requiresAuth: true,
        // The lobby lives under My Duels; this shows when you're queued.
        showStatus: true,
      },
      {
        href: "/wizards",
        label: "Wizards",
        icon: Wand2,
        requiresAuth: true,
      },
      { href: "/duels/watch", label: "Watch Duels", icon: Eye },
      { href: "/leaderboard", label: "Leaderboard", icon: Crown },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/credits", label: "Tokens", icon: Coins, requiresAuth: true },
      { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
      {
        href: "/invite",
        label: "Invite Friends",
        icon: Gift,
        requiresAuth: true,
        requiresInvitePerk: true,
      },
    ],
  },
  {
    items: [{ href: "/rules", label: "Rules & Safety", icon: ShieldCheck }],
  },
];

const adminGroup: NavGroup = {
  title: "Super Admin",
  items: [
    {
      href: "/admin",
      label: "Admin Dashboard",
      icon: Shield,
      requiresAuth: true,
    },
  ],
};

/** Groups visible to the current viewer, with empty groups dropped. */
export function getVisibleGroups({
  isSignedIn,
  isSuperAdmin,
  hasInvitePerk = false,
  exclude = [],
}: {
  isSignedIn: boolean;
  isSuperAdmin: boolean;
  hasInvitePerk?: boolean;
  exclude?: string[];
}): NavGroup[] {
  const groups = isSuperAdmin ? [...navGroups, adminGroup] : navGroups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (isSignedIn || !item.requiresAuth) &&
          (hasInvitePerk || !item.requiresInvitePerk) &&
          !exclude.includes(item.href),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

const startsWithSegment = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

export interface TabItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  showStatus?: boolean;
  primary?: boolean;
}

const homeTab: TabItem = {
  href: "/",
  label: "Home",
  icon: Home,
  isActive: (p) => p === "/",
};

export const signedInTabs: TabItem[] = [
  homeTab,
  {
    href: "/campaign",
    label: "Campaign",
    icon: Scroll,
    isActive: (p) => startsWithSegment(p, "/campaign"),
  },
  {
    href: "/duels",
    label: "Duels",
    icon: Swords,
    // Creating, joining and the lobby all live under Duels.
    isActive: (p) => startsWithSegment(p, "/duels"),
    showStatus: true,
  },
  {
    href: "/wizards",
    label: "Wizards",
    icon: Wand2,
    isActive: (p) => startsWithSegment(p, "/wizards"),
  },
];

export const signedOutTabs: TabItem[] = [
  homeTab,
  {
    href: "/duels/watch",
    label: "Watch",
    icon: Eye,
    isActive: (p) => startsWithSegment(p, "/duels/watch"),
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: Crown,
    isActive: (p) => startsWithSegment(p, "/leaderboard"),
  },
];

/**
 * Section roots: reachable straight from the nav, so they need no back button.
 * Anything else (a wizard, a duel, a form) counts as a sub-page.
 */
const TOP_LEVEL_ROUTES = [
  "/",
  "/profile",
  "/credits",
  "/invite",
  "/leaderboard",
  "/wizards",
  "/campaign",
  "/duels",
  "/duels/watch",
  "/duels/lobby",
  "/rules",
  "/admin",
];

const normalize = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

export function isTopLevelRoute(pathname: string): boolean {
  return TOP_LEVEL_ROUTES.includes(normalize(pathname));
}

/**
 * Where "back" goes when there's no in-app history to pop (e.g. the page was
 * opened from a shared link): the nearest top-level ancestor, else home.
 */
export function getBackFallback(pathname: string): string {
  const segments = normalize(pathname).split("/").filter(Boolean);
  while (segments.length > 0) {
    segments.pop();
    const candidate = `/${segments.join("/")}`;
    if (isTopLevelRoute(candidate)) return candidate;
  }
  return "/";
}
