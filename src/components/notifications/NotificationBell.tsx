"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

/** Bell linking to the inbox, with an unread count. Render for signed-in players only. */
export function NotificationBell({ className }: { className?: string }) {
  const unread = useQuery(api.notifications.getMyUnreadCount) ?? 0;
  const label = unread > 99 ? "99+" : String(unread);

  return (
    <Link
      href="/notifications"
      aria-label={
        unread > 0 ? `Notifications, ${label} unread` : "Notifications"
      }
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-5 text-primary-foreground">
          {label}
        </span>
      )}
    </Link>
  );
}
