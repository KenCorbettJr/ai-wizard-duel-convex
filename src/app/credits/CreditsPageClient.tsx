"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Coins,
  Gift,
  Infinity as InfinityIcon,
  Swords,
  XCircle,
} from "lucide-react";
import posthog from "posthog-js";
import { api } from "../../../convex/_generated/api";
import {
  DUEL_TOKEN_COST,
  TO_THE_DEATH_MAX_ROUNDS,
} from "../../../convex/lib/pricing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditUsageHistory } from "@/components/CreditUsageHistory";
import { PageHeader } from "@/components/PageHeader";
import { TokenPacks } from "@/components/TokenPacks";
import { RuneSpinner } from "@/components/ui/rune-spinner";

export function CreditsPageClient() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const purchase = searchParams.get("purchase");
  const sessionId = searchParams.get("session_id");

  const tokens = useQuery(
    api.imageCreditService.getUserImageCredits,
    user?.id ? { userId: user.id } : "skip",
  );
  const purchaseStatus = useQuery(
    api.payments.getMyPurchaseStatus,
    user?.id && purchase === "success" && sessionId
      ? { stripeSessionId: sessionId }
      : "skip",
  );

  // Record a completed purchase once per page load
  const tracked = useRef(false);
  useEffect(() => {
    if (purchaseStatus?.status === "COMPLETED" && !tracked.current) {
      tracked.current = true;
      posthog.capture("token_purchase_completed", {
        pack_id: purchaseStatus.packId,
        tokens: purchaseStatus.tokens,
      });
    }
  }, [purchaseStatus]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <PageHeader
            title="Tokens"
            description="Please sign in to view and buy tokens."
            icon={<Coins className="h-6 w-6" aria-hidden="true" />}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-5xl mx-auto space-y-10">
        <PageHeader
          className="mb-0"
          title="Tokens"
          description="One token enters one duel, whatever its length. Buy more and each duel costs less."
          icon={<Coins className="h-6 w-6" aria-hidden="true" />}
        />

        {purchase === "success" && (
          <PurchaseBanner
            status={
              purchaseStatus === undefined
                ? "loading"
                : (purchaseStatus?.status ?? "missing")
            }
            tokens={purchaseStatus?.tokens}
          />
        )}
        {purchase === "cancelled" && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <XCircle
              className="h-5 w-5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            Checkout was cancelled. You weren&apos;t charged.
          </div>
        )}

        {/* Balance */}
        <Card className="bg-arcane-soft border-primary/30">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Your balance
              </div>
              <div className="flex items-center justify-center gap-2 text-4xl font-bold sm:justify-start">
                <Coins className="h-8 w-8 text-gold" aria-hidden="true" />
                {tokens ?? "–"}
              </div>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {tokens === 0
                ? "You're out of tokens. Pick a pack below to keep dueling."
                : `That's ${tokens ?? 0} duel${tokens === 1 ? "" : "s"} or campaign battle${tokens === 1 ? "" : "s"}.`}
            </p>
          </CardContent>
        </Card>

        {/* Packs */}
        <section aria-labelledby="buy-tokens" className="space-y-6">
          <h2
            id="buy-tokens"
            className="text-2xl font-bold font-display text-center"
          >
            Buy Tokens
          </h2>
          <TokenPacks mode="buy" />
          <p className="text-center text-xs text-muted-foreground">
            Secure checkout by Stripe. Tokens never expire and can&apos;t be
            exchanged for cash.
          </p>
        </section>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How tokens work</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex gap-3">
              <Swords
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                <span className="font-medium">
                  {DUEL_TOKEN_COST} token = 1 duel.
                </span>{" "}
                3, 5 or 10 rounds, or To the Death (up to{" "}
                {TO_THE_DEATH_MAX_ROUNDS} rounds). Same price.
              </p>
            </div>
            <div className="flex gap-3">
              <Gift
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                <span className="font-medium">Cover a friend.</span> When you
                create a duel, you can pay your opponent&apos;s token so they
                play free.
              </p>
            </div>
            <div className="flex gap-3">
              <InfinityIcon
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p>
                <span className="font-medium">Never expire.</span> You&apos;re
                only charged when a duel actually starts. Cancelled duels are
                refunded.
              </p>
            </div>
          </CardContent>
        </Card>

        <CreditUsageHistory />
      </div>
    </div>
  );
}

function PurchaseBanner({
  status,
  tokens,
}: {
  status: "loading" | "PENDING" | "COMPLETED" | "missing";
  tokens?: number;
}) {
  if (status === "COMPLETED") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-sm"
        role="status"
      >
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <span>
          <span className="font-semibold">Thank you!</span> {tokens} tokens were
          added to your balance.
        </span>
      </div>
    );
  }
  if (status === "missing") {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
        role="status"
      >
        <Coins className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
        Your payment went through. Your tokens will appear here shortly.
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm"
      role="status"
    >
      <RuneSpinner size="xs" label="Confirming payment…" />
      Confirming your payment with Stripe…
    </div>
  );
}
