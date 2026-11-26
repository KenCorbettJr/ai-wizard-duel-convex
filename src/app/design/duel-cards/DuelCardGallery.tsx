"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DuelCard, DuelCardSkeleton } from "@/components/DuelCard";
import type { DuelCardDuel, DuelCardWizard } from "@/components/DuelCard";

/**
 * Renders each card state from one real duel, so states that rarely occur in
 * dev data (live, resumed, won) can be checked by eye.
 */
export function DuelCardGallery() {
  const result = useQuery(api.duels.getWatchableDuels, {
    limit: 1,
    offset: 0,
  });
  const base = result?.duels[0];
  const left = useQuery(
    api.wizards.getWizardWithOwner,
    base ? { wizardId: base.wizards[0] } : "skip",
  );
  const right = useQuery(
    api.wizards.getWizardWithOwner,
    base ? { wizardId: base.wizards[1] } : "skip",
  );
  // Pretend the viewer watched two rounds of the "continue" sample. Done
  // during render (once) so it lands before the cards read it in effects.
  useState(() => {
    try {
      localStorage.setItem("duelReplayProgress:gallery-continue", "2");
    } catch {
      // No storage (or server render): the pill just won't show.
    }
  });

  const [anHourAgo] = useState(() => Date.now() - 60 * 60 * 1000);

  if (!base || !left || !right) {
    return (
      <div className="container mx-auto grid gap-5 px-4 py-8 md:grid-cols-3">
        <DuelCardSkeleton />
      </div>
    );
  }

  const wizards: DuelCardWizard[] = [left, right];
  const duel = (over: Partial<DuelCardDuel>): DuelCardDuel => ({
    ...base,
    ...over,
  });
  const samples: Array<{
    label: string;
    duel: DuelCardDuel;
    viewerId?: string;
    featured?: boolean;
  }> = [
    {
      label: "Live, featured",
      duel: duel({
        _id: "gallery-live-f",
        status: "IN_PROGRESS",
        currentRound: 2,
      }),
      featured: true,
    },
    {
      label: "Live",
      duel: duel({
        _id: "gallery-live",
        status: "IN_PROGRESS",
        currentRound: 2,
      }),
    },
    {
      label: "Popular replay",
      duel: duel({ _id: "gallery-new", uniqueViewers: 128 }),
    },
    {
      label: "New (finished an hour ago, unwatched)",
      duel: duel({ _id: "gallery-fresh", createdAt: anHourAgo }),
    },
    {
      label: "Replay without an opening exchange",
      duel: duel({ _id: "gallery-no-openings", openings: [] }),
    },
    {
      label: "Continue replay",
      duel: duel({ _id: "gallery-continue" }),
    },
    {
      label: "Your duel (won)",
      duel: duel({
        _id: "gallery-mine",
        winners: [left._id],
        numberOfRounds: "TO_THE_DEATH",
        players: ["gallery-viewer"],
      }),
      viewerId: "gallery-viewer",
    },
    {
      label: "Waiting for players",
      duel: duel({
        _id: "gallery-waiting",
        status: "WAITING_FOR_PLAYERS",
        shortcode: "ABC123",
        openings: [],
      }),
    },
  ];

  return (
    <div className="@container container mx-auto px-4 py-8 sm:px-6">
      <h1 className="mb-6 font-display text-3xl font-bold">Duel cards</h1>
      <div className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {samples.map((s) => (
          <div
            key={s.label}
            className={s.featured ? "@2xl:col-span-2 @5xl:col-span-3" : ""}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
            <DuelCard
              duel={s.duel}
              wizards={wizards}
              viewerId={s.viewerId}
              featured={s.featured}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
