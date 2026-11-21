"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Coins, Gift, Swords, Wand2 } from "lucide-react";
import {
  REFERRAL_BONUS_TOKENS,
  STARTING_TOKENS,
} from "../../../../convex/lib/pricing";
import { Button } from "@/components/ui/button";
import { rememberReferral } from "@/lib/referral";

interface Props {
  inviter: { handle: string; displayName?: string } | null;
}

export function InviteLanding({ inviter }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  const name = inviter?.displayName || inviter?.handle;

  // Remember the invite so it's attached when the account is created.
  useEffect(() => {
    if (inviter && isLoaded && !isSignedIn) rememberReferral(inviter.handle);
  }, [inviter, isLoaded, isSignedIn]);

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-10rem)] items-center px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-arcane text-white shadow-lg shadow-primary/30">
          <Gift className="size-8" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">
          {name ? (
            <>
              <span className="text-gold-gradient">{name}</span> invited you to
              AI Wizard Duel
            </>
          ) : (
            "You're invited to AI Wizard Duel"
          )}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Create a wizard, cast spells in your own words, and watch the AI
          bring the duel to life.
        </p>

        {inviter && (
          <div className="mt-8 rounded-2xl border border-gold/50 bg-gold/10 p-5 text-left">
            <p className="flex items-center gap-2 font-semibold">
              <Coins className="size-5 shrink-0 text-gold" aria-hidden="true" />
              Start with {STARTING_TOKENS + REFERRAL_BONUS_TOKENS} tokens instead
              of {STARTING_TOKENS}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Every new player gets {STARTING_TOKENS}. Finish your first duel
              and you&apos;ll get {REFERRAL_BONUS_TOKENS} more, and {name} gets{" "}
              {REFERRAL_BONUS_TOKENS} too for bringing you.
            </p>
          </div>
        )}

        {!isLoaded ? null : isSignedIn ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              You already have an account, so this invite doesn&apos;t apply.
              You can invite your own friends, though.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/invite">
                  <Gift className="size-4" aria-hidden="true" />
                  Invite friends
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Go home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="text-base">
              <Link href="/sign-up">
                <Wand2 className="size-4" aria-hidden="true" />
                Create your account
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <Link href="/duels/watch">
                <Swords className="size-4" aria-hidden="true" />
                Watch a duel first
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
