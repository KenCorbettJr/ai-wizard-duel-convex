import type { Metadata } from "next";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  Filter,
  BrainCircuit,
  Feather,
  UserCheck,
  MessagesSquare,
  Globe,
  Coins,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { HowToWin } from "@/components/HowToWin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Arena Rules & Safety",
  description:
    "How to win a duel, and how AI Wizard Duel keeps everything PG-13. Every spell, wizard and username is checked before anyone sees it.",
};

const NOT_ALLOWED = [
  "Swearing, including disguised spellings",
  "Anything sexual, including innuendo",
  "Hateful words about real groups of people",
  "Gory or gruesome descriptions",
  "Bullying or threatening a real person",
  "Self-harm",
  "Personal details: addresses, phone numbers, schools, real names",
  "Tricking the AI into breaking the rules",
  "Wizards named after someone else's character or a real person",
];

const SAFEGUARDS = [
  {
    icon: Filter,
    title: "Everything is checked first",
    text: "Every spell, wizard, chat message and username is checked when it's submitted. If it breaks the rules, nobody ever sees it.",
  },
  {
    icon: BrainCircuit,
    title: "Two layers of checking",
    text: "A word filter catches bad words and disguised spellings. Then an AI moderator reads for context, so a fireball is fine but innuendo and bullying aren't.",
  },
  {
    icon: Feather,
    title: "The storyteller follows the same rules",
    text: "The AI that narrates and illustrates each duel keeps everything PG-13 and drops anything that slips through.",
  },
  {
    icon: UserCheck,
    title: "Repeat offenders are stopped",
    text: "Too many rejected attempts locks a player out of writing for a while. We review every rejection.",
  },
];

const FACTS = [
  {
    icon: MessagesSquare,
    title: "No private messages",
    text: "Duel chat is short, checked like spells, and either player can turn it off.",
  },
  {
    icon: Globe,
    title: "Duels are public",
    text: "Anyone can watch, so there's nowhere to hide bad behavior.",
  },
  {
    icon: Coins,
    title: "One-time purchases",
    text: "One token per duel. No subscriptions, and tokens never expire.",
  },
];

export default function RulesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:py-12">
      <PageHeader
        title="Arena Rules & Safety"
        description="How to win, what's off limits, and how we keep the arena PG-13."
        icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
      />

      <section
        id="how-to-win"
        aria-labelledby="how-to-win-heading"
        className="mb-12 scroll-mt-24"
      >
        <h2
          id="how-to-win-heading"
          className="mb-4 font-display text-2xl font-bold"
        >
          How to Win a Duel
        </h2>
        <HowToWin />
      </section>

      <section aria-labelledby="rules-heading" className="mb-12">
        <h2 id="rules-heading" className="mb-2 font-display text-2xl font-bold">
          Not Allowed in the Arena
        </h2>
        <p className="mb-4 text-muted-foreground">
          If you can imagine it, you can probably cast it. Just keep it PG-13.
        </p>
        <Card>
          <CardContent className="py-5">
            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {NOT_ALLOWED.map((item) => (
                <li key={item} className="flex gap-3">
                  <X
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <p className="mt-4 text-muted-foreground">
          Break a rule and the Watcher, the arena&apos;s silent guardian, stops
          the spell. Nothing is spent, so rewrite it and try again. Keep
          pushing and your magic is silenced for a while.
        </p>
      </section>

      <section aria-labelledby="parents-heading" className="mb-12">
        <h2
          id="parents-heading"
          className="mb-4 font-display text-2xl font-bold"
        >
          For Parents
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SAFEGUARDS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="flex gap-4 py-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-arcane text-white shadow-md shadow-primary/30">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {FACTS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-2 py-5">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No filter is perfect, so we use several layers and keep improving
          them as we learn.
        </p>
      </section>

      <div className="flex flex-wrap justify-center gap-4">
        <Button asChild variant="outline" size="lg">
          <Link href="/duels/watch">Watch a duel</Link>
        </Button>
        <Button asChild variant="gold" size="lg">
          <Link href="/sign-up">Start playing free</Link>
        </Button>
      </div>
    </div>
  );
}
