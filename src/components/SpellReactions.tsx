"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { SmilePlus } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SPELL_REACTIONS } from "../../convex/lib/spellReactions";
import { cn } from "@/lib/utils";

interface SpellReactionsProps {
  duelId: Id<"duels">;
  roundId: Id<"duelRounds">;
  wizardId: Id<"wizards">;
  wizardName: string;
  /** Signed-in viewers only; others see nothing. */
  signedIn: boolean;
  /** The viewer cast this spell: they see its reactions but can't add any. */
  ownSpell: boolean;
  className?: string;
}

interface Floater {
  id: number;
  emoji: string;
  drift: number;
}

/**
 * Emoji reactions under a wizard's spell. Shows the emoji people have used,
 * with counts; tapping one adds or removes yours. The + button opens the
 * full set. When someone else reacts while you watch, their emoji floats up.
 */
export function SpellReactions({
  duelId,
  roundId,
  wizardId,
  wizardName,
  signedIn,
  ownSpell,
  className,
}: SpellReactionsProps) {
  // One subscription for the whole duel, shared by every spell on the page.
  const all = useQuery(
    api.spellReactions.forDuel,
    signedIn ? { duelId } : "skip",
  );
  const toggle = useMutation(api.spellReactions.toggle).withOptimisticUpdate(
    (store, { emoji }) => {
      const current = store.getQuery(api.spellReactions.forDuel, { duelId });
      if (!current) return;
      const match = (r: (typeof current)[number]) =>
        r.roundId === roundId && r.wizardId === wizardId && r.emoji === emoji;
      const existing = current.find(match);
      let next;
      if (!existing) {
        next = [...current, { roundId, wizardId, emoji, count: 1, mine: true }];
      } else if (existing.mine) {
        next = current
          .map((r) =>
            match(r) ? { ...r, count: r.count - 1, mine: false } : r,
          )
          .filter((r) => r.count > 0);
      } else {
        next = current.map((r) =>
          match(r) ? { ...r, count: r.count + 1, mine: true } : r,
        );
      }
      store.setQuery(api.spellReactions.forDuel, { duelId }, next);
    },
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const mine = (all ?? []).filter(
    (r) => r.roundId === roundId && r.wizardId === wizardId,
  );
  const ordered = SPELL_REACTIONS.map((emoji) =>
    mine.find((r) => r.emoji === emoji),
  ).filter((r): r is NonNullable<typeof r> => !!r && r.count > 0);

  // Float up emoji that other people add while this is on screen.
  const prev = useRef<Map<string, { count: number; mine: boolean }> | null>(
    null,
  );
  const nextId = useRef(0);
  useEffect(() => {
    if (!all) return;
    const now = new Map(
      all
        .filter((r) => r.roundId === roundId && r.wizardId === wizardId)
        .map((r) => [r.emoji, { count: r.count, mine: r.mine }]),
    );
    const before = prev.current;
    prev.current = now;
    if (!before) return;
    const spawned: Floater[] = [];
    for (const [emoji, { count, mine: isMine }] of now) {
      const old = before.get(emoji) ?? { count: 0, mine: false };
      // Discount the viewer's own tap.
      const added = count - old.count - (isMine && !old.mine ? 1 : 0);
      for (let i = 0; i < Math.min(added, 5); i++) {
        spawned.push({
          id: nextId.current++,
          emoji,
          drift: Math.round((Math.random() - 0.5) * 60),
        });
      }
    }
    if (spawned.length) setFloaters((f) => [...f, ...spawned]);
  }, [all, roundId, wizardId]);

  // Close the picker on outside click or Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  if (!signedIn || all === undefined || all === null) return null;
  if (ownSpell && ordered.length === 0) return null;

  const canReact = !ownSpell;
  const react = async (emoji: string) => {
    setPickerOpen(false);
    try {
      const { reacted } = await toggle({ roundId, wizardId, emoji });
      if (reacted) posthog.capture("spell_reaction_added", { emoji });
    } catch (e) {
      toast.error(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Couldn't save that reaction.",
      );
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative mt-3 flex flex-wrap items-center gap-1.5",
        className,
      )}
      role="group"
      aria-label={`Reactions to ${wizardName}'s spell`}
    >
      {ordered.map((r) => (
        <button
          key={r.emoji}
          type="button"
          disabled={!canReact}
          onClick={() => react(r.emoji)}
          aria-pressed={canReact ? r.mine : undefined}
          aria-label={`${r.emoji} ${r.count}${r.mine ? ", including you" : ""}`}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-sm tabular-nums transition-colors disabled:cursor-default",
            r.mine
              ? "border-primary/60 bg-primary/15 text-foreground"
              : "border-border/60 bg-background/60 text-muted-foreground",
            canReact && "hover:border-primary/50 hover:bg-primary/10",
          )}
        >
          <span aria-hidden="true">{r.emoji}</span>
          <span aria-hidden="true" className="text-xs font-medium">
            {r.count}
          </span>
        </button>
      ))}

      {canReact && (
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          aria-label={`React to ${wizardName}'s spell`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <SmilePlus className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {pickerOpen && (
        <div
          role="menu"
          aria-label="Pick a reaction"
          className="absolute bottom-full left-0 z-20 mb-2 flex gap-0.5 rounded-full border border-border/60 bg-popover px-1.5 py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150"
        >
          {SPELL_REACTIONS.map((emoji) => {
            const active = mine.some((r) => r.emoji === emoji && r.mine);
            return (
              <button
                key={emoji}
                type="button"
                role="menuitemcheckbox"
                aria-checked={active}
                aria-label={`React ${emoji}`}
                onClick={() => react(emoji)}
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xl transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95",
                  active && "bg-primary/15",
                )}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-3"
      >
        {floaters.map((f) => (
          <span
            key={f.id}
            className="reaction-float absolute bottom-0 left-0 text-2xl"
            style={{ "--drift": `${f.drift}px` } as React.CSSProperties}
            onAnimationEnd={() =>
              setFloaters((list) => list.filter((x) => x.id !== f.id))
            }
          >
            {f.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
