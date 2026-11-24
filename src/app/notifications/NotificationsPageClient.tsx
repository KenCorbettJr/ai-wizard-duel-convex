"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Bell, Clapperboard, Swords, Trophy } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/PageHeader";
import { PushSettingsCard } from "@/components/notifications/PushSettingsCard";
import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { cn } from "@/lib/utils";

export function NotificationsPageClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const notifications = useQuery(
    api.notifications.listMyNotifications,
    isSignedIn ? {} : "skip",
  );
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAllRead = useMutation(api.notifications.markAllNotificationsRead);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  // Clear the home-screen badge once the inbox is open.
  useEffect(() => {
    navigator.clearAppBadge?.().catch(() => {});
  }, []);

  const hasUnread = notifications?.some((n) => !n.readAt);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Notifications"
          icon={<Bell className="h-6 w-6" aria-hidden="true" />}
          actions={
            hasUnread ? (
              <Button variant="outline" size="sm" onClick={() => markAllRead()}>
                Mark all read
              </Button>
            ) : undefined
          }
        />

        <PushSettingsCard />

        <div className="mt-6">
          {notifications === undefined ? (
            <RuneSpinner label="Loading notifications…" className="py-12" />
          ) : notifications.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Nothing yet. We&rsquo;ll let you know when it&rsquo;s your turn to
              cast.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {notifications.map((n) => (
                <li key={n._id}>
                  <Link
                    href={n.url}
                    onClick={() => {
                      if (!n.readAt) markRead({ notificationId: n._id });
                    }}
                    className={cn(
                      "flex gap-3 p-4 transition-colors hover:bg-accent",
                      !n.readAt && "bg-primary/5",
                    )}
                  >
                    <TypeIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-medium",
                          !n.readAt && "font-semibold",
                        )}
                      >
                        {n.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <TimeAgo timestamp={n.createdAt} />
                      </p>
                    </div>
                    {!n.readAt && (
                      <span
                        className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                        aria-label="Unread"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: Doc<"notifications">["type"] }) {
  const Icon =
    type === "DUEL_RESULT"
      ? Trophy
      : type === "TEASER_READY"
        ? Clapperboard
        : Swords;
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-gold">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}
