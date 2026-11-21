"use client";

import { useQuery } from "convex/react";
import { Eye } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";

/**
 * Live count of onlookers in the arena (everyone viewing except the duelists),
 * plus, for a duelist, whether their opponent is here too.
 */
export function OnlookerCount({
  duelId,
  viewerId,
  players,
  showOpponent,
}: {
  duelId: Id<"duels">;
  viewerId?: string;
  players: string[];
  showOpponent: boolean;
}) {
  const arena = useQuery(api.presence.arena, { duelId });
  if (!arena) return null;

  const opponentHere =
    showOpponent &&
    !!viewerId &&
    players.some((p) => p !== viewerId && arena.playersHere.includes(p));
  const count = arena.atCapacity ? `${arena.onlookers}+` : arena.onlookers;

  return (
    <>
      {opponentHere && (
        <Badge variant="outline" className="flex items-center gap-1.5">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Opponent here
        </Badge>
      )}
      {arena.onlookers > 0 && (
        <Badge
          variant="outline"
          className="flex items-center gap-1.5"
          aria-live="polite"
        >
          <Eye className="h-3 w-3 text-gold" aria-hidden="true" />
          {count} watching
        </Badge>
      )}
    </>
  );
}

/** Compact live onlooker badge for duel lists. Hidden when nobody's watching. */
export function OnlookerBadge({ duelId }: { duelId: Id<"duels"> }) {
  const arena = useQuery(api.presence.arena, { duelId });
  if (!arena || arena.onlookers === 0) return null;
  const count = arena.atCapacity ? `${arena.onlookers}+` : arena.onlookers;
  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Eye className="h-3 w-3 text-gold" aria-hidden="true" />
      <span>
        {count}
        <span className="sr-only"> watching</span>
      </span>
    </Badge>
  );
}
