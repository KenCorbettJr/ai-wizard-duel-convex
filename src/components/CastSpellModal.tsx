"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";

export const COMPOSER_ID = "spell-composer";
export const MAX_SPELL_LENGTH = 500;

const suggestionsFor = (name: string, lastResult?: string) => [
  ...(lastResult
    ? [
        `${name} answers back after: "${lastResult
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80)}"`,
      ]
    : []),
  `${name} conjures a wall of flame to block their attack`,
  `${name} summons a gust of wind to throw them off balance`,
  `${name} raises a shimmering shield, then counter-strikes with lightning`,
];

interface CastSpellModalProps {
  currentRound: number;
  wizardName: string;
  spellDescription: string;
  onSpellDescriptionChange: (value: string) => void;
  onCastSpell: () => void;
  isCasting: boolean;
  /** Message from the last failed submit, shown inline with the draft kept. */
  error?: string | null;
  /** Collapse state lives in the parent so it survives between rounds. */
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  /** Teaser from the previous round, used for a contextual suggestion. */
  lastRoundResult?: string;
  /** Reports the panel height so the page can reserve exactly that much space. */
  onHeightChange?: (height: number) => void;
}

export function CastSpellModal({
  currentRound,
  wizardName,
  spellDescription,
  onSpellDescriptionChange,
  onCastSpell,
  isCasting,
  error,
  collapsed: isModalCollapsed,
  onCollapsedChange: setIsModalCollapsed,
  lastRoundResult,
  onHeightChange,
}: CastSpellModalProps) {
  const panelRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLButtonElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  // Keep the panel above the on-screen keyboard (iOS keeps fixed elements put).
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setKeyboardInset(
        Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
      );
      setViewportHeight(vv.height);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Focus the composer when the player's turn starts. Skipped on touch devices
  // so the on-screen keyboard doesn't open unprompted.
  useEffect(() => {
    if (
      window.matchMedia("(pointer: fine)").matches &&
      (document.activeElement === document.body ||
        document.activeElement === null) &&
      document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight) <
        900
    ) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [currentRound]);

  // On small screens, trim the sticky scoreboard while the composer is open.
  useEffect(() => {
    const root = document.documentElement;
    if (isModalCollapsed) root.removeAttribute("data-composer-open");
    else root.setAttribute("data-composer-open", "true");
    return () => root.removeAttribute("data-composer-open");
  }, [isModalCollapsed]);

  // Reserve exactly the space the panel occupies.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !onHeightChange) return;
    const report = () =>
      onHeightChange(el.getBoundingClientRect().height + keyboardInset);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => {
      ro.disconnect();
      onHeightChange(0);
    };
  }, [onHeightChange, keyboardInset]);

  const canSubmit = !!spellDescription.trim() && !isCasting;
  const remaining = MAX_SPELL_LENGTH - spellDescription.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setIsModalCollapsed(true);
      requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) onCastSpell();
    }
  };

  return (
    <section
      ref={panelRef}
      id={COMPOSER_ID}
      aria-label={`Your action for round ${currentRound}`}
      style={{ bottom: keyboardInset }}
      className="fixed inset-x-0 z-30 md:left-64 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4"
    >
      <Card className="mx-auto w-full max-w-4xl gap-3 border-2 border-primary/50 bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out dark:shadow-3xl">
        <CardHeader
          className={`gap-0 ${isModalCollapsed ? "cursor-pointer" : ""}`}
          onClick={
            isModalCollapsed ? () => setIsModalCollapsed(false) : undefined
          }
        >
          <div className="flex items-center justify-between">
            <CardTitle className="min-w-0 flex-1 text-lg text-foreground">
              <button
                ref={titleRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalCollapsed(!isModalCollapsed);
                }}
                aria-expanded={!isModalCollapsed}
                aria-controls={`${COMPOSER_ID}-body`}
                className="flex w-full items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <Sparkles
                  className="h-5 w-5 shrink-0 animate-pulse text-primary motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <span className="truncate">Your move, {wizardName}</span>
                <span className="shrink-0 text-sm font-normal text-muted-foreground">
                  {isModalCollapsed
                    ? `Round ${currentRound} · tap to write`
                    : `Round ${currentRound}`}
                </span>
              </button>
            </CardTitle>
            <Button
              tabIndex={-1}
              aria-hidden="true"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalCollapsed(!isModalCollapsed)}
              className="size-11 p-0 text-primary hover:bg-primary/20"
              aria-label={
                isModalCollapsed ? "Expand spell panel" : "Collapse spell panel"
              }
              aria-expanded={!isModalCollapsed}
              aria-controls={`${COMPOSER_ID}-body`}
            >
              {isModalCollapsed ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent
          id={`${COMPOSER_ID}-body`}
          className="max-h-[45dvh] overflow-y-auto pt-0"
          style={
            viewportHeight
              ? { maxHeight: Math.floor(viewportHeight * 0.45) }
              : undefined
          }
          hidden={isModalCollapsed}
        >
          {!isModalCollapsed && (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                aria-label={`Describe what ${wizardName} will do in round ${currentRound}`}
                aria-describedby={`${COMPOSER_ID}-hint`}
                aria-invalid={!!error}
                value={spellDescription}
                maxLength={MAX_SPELL_LENGTH}
                onChange={(e) => onSpellDescriptionChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Describe the spell or action ${wizardName} will use. Be specific and creative.`}
                className="h-24 w-full resize-none rounded-lg border border-input/50 bg-background/50 p-3 text-sm text-foreground backdrop-blur-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus-visible:outline-none dark:placeholder:text-muted-foreground/50"
                disabled={isCasting}
              />
              <div className="flex flex-wrap gap-2" aria-label="Ideas">
                {suggestionsFor(wizardName, lastRoundResult)
                  .slice(0, 3)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isCasting}
                      onClick={() => {
                        onSpellDescriptionChange(
                          spellDescription.trim()
                            ? `${spellDescription.trim()} ${s}`.slice(
                                0,
                                MAX_SPELL_LENGTH,
                              )
                            : s,
                        );
                        textareaRef.current?.focus();
                      }}
                      className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      {s}
                    </button>
                  ))}
              </div>
              <div
                id={`${COMPOSER_ID}-hint`}
                className="flex items-center justify-between text-xs text-muted-foreground"
              >
                <span>
                  Press <kbd className="rounded border px-1">Ctrl/⌘</kbd>+
                  <kbd className="rounded border px-1">Enter</kbd> to submit
                </span>
                <span
                  className={remaining < 50 ? "font-medium text-warning" : ""}
                >
                  {remaining} characters left
                </span>
              </div>
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error} Your text is saved. Try again.</span>
                </div>
              )}
              <Button
                onClick={onCastSpell}
                disabled={!canSubmit}
                className="w-full disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCasting ? (
                  <>
                    <RuneSpinner size="sm" label="Loading" />
                    Submitting…
                  </>
                ) : error ? (
                  "Retry submit"
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Cast for Round {currentRound}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
