"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { Coins } from "lucide-react";
import posthog from "posthog-js";
import { api } from "../../convex/_generated/api";
import {
  TOKEN_PACKS,
  bonusTokens,
  formatCentsPerDuel,
  formatPrice,
  type TokenPack,
  type TokenPackId,
} from "../../convex/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuneSpinner } from "@/components/ui/rune-spinner";

interface TokenPacksProps {
  /**
   * "buy" shows a checkout button on each pack (signed-in players).
   * "display" shows prices only, for the marketing page.
   */
  mode: "buy" | "display";
  className?: string;
  /** Same-site page to offer a way back to after checkout. */
  returnTo?: string;
}

/** The token packs from the shared pricing config, as a grid of cards. */
export function TokenPacks({
  mode,
  className = "",
  returnTo,
}: TokenPacksProps) {
  const createCheckout = useAction(api.stripe.createTokenCheckout);
  const [pendingPack, setPendingPack] = useState<TokenPackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (pack: TokenPack) => {
    setPendingPack(pack.id);
    setError(null);
    posthog.capture("token_checkout_started", {
      pack_id: pack.id,
      tokens: pack.tokens,
      price_cents: pack.priceCents,
    });
    try {
      const { url } = await createCheckout({ packId: pack.id, returnTo });
      window.location.assign(url);
    } catch (err) {
      console.error("Failed to start checkout:", err);
      setError("We couldn't start checkout. Please try again in a moment.");
      setPendingPack(null);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {TOKEN_PACKS.map((pack) => {
          const bonus = bonusTokens(pack);
          const featured = pack.badge === "Most popular";
          return (
            <Card
              key={pack.id}
              className={`relative flex h-full flex-col text-center ${
                featured ? "border-gold ring-1 ring-gold/60" : ""
              }`}
            >
              {pack.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-linear-to-b from-gold to-gold/75 px-3 py-0.5 text-xs font-semibold text-gold-foreground shadow-sm">
                  {pack.badge}
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-xl">
                  {pack.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <div className="text-4xl font-bold">
                    {formatPrice(pack.priceCents)}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-lg font-semibold">
                    <Coins className="h-5 w-5 text-gold" aria-hidden="true" />
                    {pack.tokens} tokens
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      {pack.tokens} duels
                    </span>{" "}
                    at {formatCentsPerDuel(pack)} each
                  </p>
                  <p className={bonus > 0 ? "text-success" : "invisible"}>
                    {bonus > 0 ? `Includes ${bonus} bonus tokens` : "No bonus"}
                  </p>
                </div>
                {mode === "buy" && (
                  <Button
                    className="mt-auto w-full"
                    variant={featured ? "gold" : "default"}
                    disabled={pendingPack !== null}
                    onClick={() => handleBuy(pack)}
                  >
                    {pendingPack === pack.id ? (
                      <>
                        <RuneSpinner
                          size="xs"
                          label="Opening checkout…"
                          className="mr-2"
                        />
                        Opening checkout…
                      </>
                    ) : (
                      `Buy for ${formatPrice(pack.priceCents)}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {error && (
        <p className="mt-4 text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
