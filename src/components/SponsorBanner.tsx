"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ExternalLink, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";

export type CurrentSponsorship = NonNullable<
  ReturnType<typeof useQuery<typeof api.sponsorships.getCurrent>>
>;

/**
 * The sponsorship running right now, or null. Hides itself when the window
 * ends, since the query only re-runs when the data changes.
 */
export function useSponsorship(): CurrentSponsorship | null | undefined {
  const current = useQuery(api.sponsorships.getCurrent, {});
  const [ended, setEnded] = useState<number | null>(null);

  const endsAt = current?.endsAt;
  useEffect(() => {
    if (endsAt === undefined) return;
    const delay = endsAt - Date.now();
    // setTimeout can't wait longer than ~24.8 days
    if (delay > 2 ** 31 - 1) return;
    const timer = setTimeout(() => setEnded(endsAt), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [endsAt]);

  if (current && ended === current.endsAt) return null;
  return current;
}

/** "Sun, Nov 30" */
export function formatSponsorEnd(endsAt: number): string {
  return new Date(endsAt).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Site-wide strip thanking the sponsor while duels are free. */
export function SponsorBanner() {
  const sponsorship = useSponsorship();
  if (!sponsorship) return null;

  return (
    <aside
      aria-label="Sponsor"
      className="border-b border-gold/40 bg-linear-to-r from-gold/20 via-gold/10 to-primary/10 px-4 py-2 text-sm"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        {sponsorship.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsorship.logoUrl}
            alt=""
            className="h-6 max-w-32 shrink-0 rounded-sm bg-white object-contain px-1.5 py-0.5"
          />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
        )}
        <p>
          <span className="font-semibold">Duels are free</span> until{" "}
          {formatSponsorEnd(sponsorship.endsAt)}, thanks to{" "}
          <span className="font-semibold">{sponsorship.sponsorName}</span>.
          {sponsorship.message && (
            <span className="text-muted-foreground">
              {" "}
              {sponsorship.message}
            </span>
          )}
        </p>
        {sponsorship.url ? (
          <a
            href={sponsorship.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-gold underline-offset-4 hover:underline"
          >
            Visit {sponsorship.sponsorName}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <Link
            href="/sponsor"
            className="font-medium text-gold underline-offset-4 hover:underline"
          >
            About sponsors
          </Link>
        )}
      </div>
    </aside>
  );
}
