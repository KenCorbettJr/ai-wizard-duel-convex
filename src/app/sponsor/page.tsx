import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BarChart3,
  CalendarRange,
  HeartHandshake,
  Mail,
  Megaphone,
  Sparkles,
  Swords,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sponsor the Duels",
  description:
    "Make AI Wizard Duel free for every player for a weekend, a week or a month. Sponsors get a thank-you on every page and every duel they pay for.",
};

const CONTACT =
  "mailto:support@aiwizardduel.com?subject=Sponsoring%20AI%20Wizard%20Duel";

const WHY = [
  {
    icon: HeartHandshake,
    title: "Open the arena to everyone",
    text: "Many of our players are kids and teens without a card of their own. A token costs about 30¢ a duel, and that's enough to keep some of them out. While you sponsor, every duel is free.",
  },
  {
    icon: Sparkles,
    title: "A live showcase for AI",
    text: "Every round is written, judged, illustrated and narrated by AI as it happens, mostly with Google's Gemini models. Players see what generative AI can do by playing with it.",
  },
  {
    icon: Users,
    title: "Goodwill with a creative crowd",
    text: "Players invent their own wizards and write every spell. Sponsoring puts your name next to their imagination, not in front of it.",
  },
];

const PERKS = [
  {
    icon: Megaphone,
    title: "A banner on every page",
    text: '"Duels are free, thanks to you," with a short message and a link to your site.',
  },
  {
    icon: Swords,
    title: "Credit on every duel you pay for",
    text: "Each sponsored duel says who paid for it, including replays people watch later.",
  },
  {
    icon: BadgeCheck,
    title: "In every player's history",
    text: "Players' token history shows each free entry as sponsored by you.",
  },
  {
    icon: BarChart3,
    title: "A report afterwards",
    text: "How many duels you covered and how many players you reached.",
  },
];

const STEPS = [
  {
    icon: CalendarRange,
    title: "Pick a window",
    text: "A weekend, a school holiday, a month. One sponsor at a time, so the spotlight is yours.",
  },
  {
    icon: Wallet,
    title: "Set a budget",
    text: "We cap the number of duels you cover, so the cost is known up front. You pay for the AI that runs them.",
  },
  {
    icon: Swords,
    title: "Players just play",
    text: "No codes to redeem. Duels and campaign battles simply cost nothing, and players keep their tokens for later.",
  },
];

export default function SponsorPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:py-12">
      <PageHeader
        title="Sponsor the Duels"
        description="Make AI Wizard Duel free for every player for a while, and get thanked on every duel you pay for."
        icon={<HeartHandshake className="h-6 w-6" aria-hidden="true" />}
      />

      <section aria-labelledby="why-heading" className="mb-12">
        <h2 id="why-heading" className="mb-4 font-display text-2xl font-bold">
          Why sponsor?
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-2 py-5">
                <Icon className="size-6 text-gold" aria-hidden="true" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-heading" className="mb-12">
        <h2 id="how-heading" className="mb-4 font-display text-2xl font-bold">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card className="h-full">
                <CardContent className="flex gap-4 py-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-arcane text-white shadow-md shadow-primary/30">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      <span className="sr-only">Step {i + 1}: </span>
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="perks-heading" className="mb-12">
        <h2 id="perks-heading" className="mb-4 font-display text-2xl font-bold">
          What sponsors get
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="flex gap-4 py-5">
                <Icon
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          The arena is PG-13 and many players are young, so sponsors need to be
          family-friendly. The banner and duel credits are the only placements.
          We don&apos;t run ads or share player data with sponsors.
        </p>
      </section>

      <Card className="bg-arcane-soft border-gold/40">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <h2 className="font-display text-2xl font-bold">
            Want to sponsor a season of duels?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Tell us when you&apos;d like to sponsor and roughly how many duels
            you&apos;d like to cover. We&apos;ll send you a quote at cost.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="gold" size="lg">
              <a href={CONTACT}>
                <Mail className="mr-2 size-4" aria-hidden="true" />
                Get in touch
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/duels/watch">Watch a duel first</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            AI Wizard Duel is made by Forthought Labs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
