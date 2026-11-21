import type { ComponentType } from "react";
import {
  Home,
  Swords,
  Eye,
  Users,
  Wand2,
  Plus,
  Crown,
  Coins,
  User,
  Scroll,
  Shield,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
  showStatus?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Home", icon: Home },
      { href: "/profile", label: "Profile", icon: User, requiresAuth: true },
      { href: "/credits", label: "Tokens", icon: Coins, requiresAuth: true },
    ],
  },
  {
    title: "Wizards",
    items: [
      { href: "/leaderboard", label: "Leaderboard", icon: Crown },
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
      { href: "/campaign", label: "Campaign", icon: Scroll, requiresAuth: true },
    ],
  },
  {
    title: "Duels",
    items: [
      { href: "/duels/watch", label: "Watch Duels", icon: Eye },
      { href: "/duels", label: "My Duels", icon: Swords, requiresAuth: true },
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
        icon: KeyRound,
        requiresAuth: true,
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
  exclude = [],
}: {
  isSignedIn: boolean;
  isSuperAdmin: boolean;
  exclude?: string[];
}): NavGroup[] {
  const groups = isSuperAdmin ? [...navGroups, adminGroup] : navGroups;
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (isSignedIn || !item.requiresAuth) && !exclude.includes(item.href),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Sub-routes of /duels that have their own nav entry. */
const DUEL_SUBSECTIONS = ["/duels/lobby", "/duels/watch", "/duels/create", "/duels/join"];

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
    href: "/duels",
    label: "Duels",
    icon: Swords,
    isActive: (p) =>
      startsWithSegment(p, "/duels") &&
      !DUEL_SUBSECTIONS.some((s) => startsWithSegment(p, s)),
  },
  {
    href: "/duels/lobby",
    label: "Quick Match",
    icon: Users,
    isActive: (p) => startsWithSegment(p, "/duels/lobby"),
    showStatus: true,
    primary: true,
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
