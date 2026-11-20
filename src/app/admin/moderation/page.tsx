"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Eye } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WATCHER_AVATAR } from "@/components/watcher/WatcherDialog";

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.moderationEvents.listRecent>>
>[number];

const SURFACES = [
  { value: "all", label: "Everything" },
  { value: "spell", label: "Spells" },
  { value: "wizard", label: "Wizards" },
  { value: "profile", label: "Profiles" },
  { value: "chat", label: "Duel chat" },
] as const;

const SORTS = [
  { value: "severity", label: "Most serious first" },
  { value: "recent", label: "Newest first" },
] as const;

function label(category: string) {
  return category.replace(/_/g, " ");
}

function EventRow({ row }: { row: Row }) {
  const who =
    row.user.displayName ?? row.user.handle ?? row.user.email ?? row.userId;
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant={row.severity >= 2 ? "destructive" : "secondary"}
            className="capitalize"
          >
            {label(row.category)}
          </Badge>
          {row.severity >= 3 && <Badge variant="destructive">Serious</Badge>}
          <Badge variant="outline" className="capitalize">
            {row.surface}
          </Badge>
          <Badge variant="secondary">
            {row.source === "ai" ? "AI" : "Wordlist"}
          </Badge>
          <span className="font-medium">{who}</span>
          {row.user.handle && row.user.handle !== who && (
            <span className="text-muted-foreground">@{row.user.handle}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDistanceToNow(row.createdAt, { addSuffix: true })}
          </span>
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 font-sans text-sm">
          {row.text}
        </pre>
        {(row.reason || row.duelId) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {row.reason && <span>Watcher&apos;s note: {row.reason}</span>}
            {row.duelId && (
              <Link
                href={`/duels/${row.duelId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Open duel
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Moderation() {
  const rows = useQuery(api.moderationEvents.listRecent, { limit: 200 });
  const [surface, setSurface] =
    useState<(typeof SURFACES)[number]["value"]>("all");

  const [sortBy, setSortBy] =
    useState<(typeof SORTS)[number]["value"]>("severity");

  const filtered = useMemo(
    () =>
      (rows ?? [])
        .filter((r) => surface === "all" || r.surface === surface)
        .sort((a, b) =>
          sortBy === "severity" && a.severity !== b.severity
            ? b.severity - a.severity
            : b.createdAt - a.createdAt,
        ),
    [rows, surface, sortBy],
  );

  const [mountedAt] = useState(() => Date.now());
  const repeatOffenders = useMemo(() => {
    const dayAgo = mountedAt - 24 * 60 * 60 * 1000;
    const counts = new Map<string, { who: string; count: number }>();
    for (const r of rows ?? []) {
      if (r.createdAt < dayAgo) continue;
      const who =
        r.user.displayName ?? r.user.handle ?? r.user.email ?? r.userId;
      const entry = counts.get(r.userId) ?? { who, count: 0 };
      entry.count++;
      counts.set(r.userId, entry);
    }
    return [...counts.values()]
      .filter((c) => c.count >= 3)
      .sort((a, b) => b.count - a.count);
  }, [rows, mountedAt]);

  return (
    <>
      <PageHeader
        title="The Watcher"
        description="Everything the Watcher rejected: spells, wizards, profile names and duel chat messages that broke the PG-13 rules. Each row is a strike; sexual and hateful content counts as two. Five strikes in an hour silences a player for ten minutes."
        icon={
          <span className="relative block size-8 overflow-hidden rounded-full">
            <Image src={WATCHER_AVATAR} alt="" fill sizes="32px" />
          </span>
        }
      />

      {repeatOffenders.length > 0 && (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="py-4 text-sm">
            <p className="mb-2 font-medium">3+ strikes in the last 24 hours</p>
            <ul className="flex flex-wrap gap-2">
              {repeatOffenders.map((o) => (
                <li key={o.who}>
                  <Badge variant="outline">
                    {o.who} · {o.count}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Show</span>
        <Select
          value={surface}
          onValueChange={(v) => setSurface(v as typeof surface)}
        >
          <SelectTrigger className="w-44" aria-label="Filter by surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SURFACES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as typeof sortBy)}
        >
          <SelectTrigger className="w-48" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows === undefined ? (
        <div className="py-12 text-center">
          <RuneSpinner size="md" label="Loading…" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Eye className="size-6" aria-hidden="true" />
            Nothing yet. The Watcher has had a quiet watch.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <EventRow key={row._id} row={row} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ModerationPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <Moderation />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
