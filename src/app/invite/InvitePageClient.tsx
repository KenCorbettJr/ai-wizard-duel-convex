"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Gift, Heart, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { STARTING_TOKENS } from "../../../convex/lib/pricing";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { inviteUrl } from "@/lib/referral";

export function InvitePageClient() {
  const { isLoaded, isSignedIn } = useAuth();
  const info = useQuery(
    api.referrals.getMyReferralInfo,
    isSignedIn ? {} : "skip",
  );
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // The perk is only for players who have bought tokens; nobody else is told
  // about it, so quietly send them elsewhere.
  const noPerk = (isLoaded && !isSignedIn) || info?.eligible === false;
  useEffect(() => {
    if (noPerk) router.replace(isSignedIn ? "/credits" : "/");
  }, [noPerk, isSignedIn, router]);

  // `info` only arrives in the browser (queries don't run during SSR), so
  // reading window/navigator below never happens on the server.
  const url = info?.handle ? inviteUrl(info.handle) : null;
  const canShare = !!info && typeof navigator.share === "function";

  const header = (
    <PageHeader
      title="Invite Friends"
      description="A thank-you for supporting AI Wizard Duel. Share your link, and when a friend joins and finishes their first duel, you both get bonus tokens."
      icon={<Gift className="h-6 w-6" aria-hidden="true" />}
    />
  );

  if (!info || noPerk) {
    return (
      <Shell>
        {header}
        <RuneSpinner label="Loading your invite link…" className="py-12" />
      </Shell>
    );
  }

  const bonus = info.bonusTokens;
  const lifetimeLeft = info.lifetimeCap - info.rewardedTotal;
  const capNote =
    lifetimeLeft <= 0
      ? `You've earned the most invite bonuses there are (${info.lifetimeCap}). Friends you invite still get their ${bonus} bonus tokens. Thank you for spreading the word!`
      : info.rewardedThisMonth >= info.monthlyCap
        ? `You've earned this month's ${info.monthlyCap} invite bonuses. Friends still get theirs, and yours start again next month.`
        : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({
        title: "AI Wizard Duel",
        text: `Duel me in AI Wizard Duel! Join with my link and we both get ${bonus} bonus tokens.`,
        url,
      });
    } catch {
      // Cancelled by the user.
    }
  };

  return (
    <Shell>
      {header}

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm">
        <Heart
          className="mt-0.5 size-5 shrink-0 text-gold"
          aria-hidden="true"
        />
        <p>
          Thanks for buying tokens! As a supporter, you earn {bonus} tokens for
          each friend who joins and finishes their first duel.
        </p>
      </div>

      {/* Phones: link, QR, stats, how-to. Desktop: QR in its own column. */}
      <div className="grid items-start gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="space-y-4 p-6">
            <label
              htmlFor="invite-link"
              className="text-sm font-medium text-muted-foreground"
            >
              Your invite link
            </label>
            <input
              id="invite-link"
              readOnly
              value={url ?? ""}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-3 font-mono text-sm"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={copy} className="min-h-11 flex-1">
                {copied ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                {copied ? "Copied!" : "Copy link"}
              </Button>
              {canShare && (
                <Button
                  onClick={share}
                  variant="outline"
                  className="min-h-11 flex-1"
                >
                  <Share2 className="size-4" aria-hidden="true" />
                  Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* QR code: white quiet zone so phone cameras read it in dark mode. */}
        <Card className="md:col-start-2 md:row-span-3 md:row-start-1">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <div className="rounded-2xl bg-white p-4 shadow-md">
              {url ? (
                <QRCodeSVG
                  value={url}
                  size={208}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1033"
                  title={`QR code for ${url}`}
                />
              ) : (
                <div className="size-52" />
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Friends can scan this with their phone camera.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="grid grid-cols-3 divide-x divide-border p-0 text-center">
            <Stat label="Friends joined" value={info.joined} />
            <Stat
              label="Bonuses this month"
              value={`${Math.min(info.rewardedThisMonth, info.monthlyCap)}/${info.monthlyCap}`}
            />
            <Stat label="Tokens earned" value={info.tokensEarned} gold />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <h2 className="flex items-center gap-2 font-semibold">
              <UserPlus className="size-4 text-gold" aria-hidden="true" />
              How it works
            </h2>
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>A friend opens your link and creates an account.</li>
              <li>
                They start with the usual {STARTING_TOKENS} tokens and finish
                their first duel or campaign battle.
              </li>
              <li>
                You each get {bonus} bonus tokens. You can earn up to{" "}
                {info.monthlyCap} bonuses a month and {info.lifetimeCap} in all;
                past that, friends still get theirs.
              </li>
            </ol>
            {capNote && (
              <p className="rounded-lg bg-muted/60 p-3 text-foreground">
                {capNote}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Only new accounts count. See your bonuses in your{" "}
              <Link href="/credits" className="underline underline-offset-4">
                token history
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  gold,
}: {
  label: string;
  value: number | string;
  gold?: boolean;
}) {
  return (
    <div className="px-2 py-5">
      <div
        className={gold ? "text-3xl font-bold text-gold" : "text-3xl font-bold"}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
