import type { Metadata } from "next";
import Link from "next/link";
import {
  Check,
  X,
  ShieldCheck,
  Filter,
  BrainCircuit,
  Feather,
  UserCheck,
  MessageSquareOff,
  Globe,
  Coins,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Arena Rules & Safety | AI Wizard Duel",
  description:
    "AI Wizard Duel keeps everything PG-13. Every spell, wizard and username is checked before anyone sees it, and the AI storyteller follows the same rules.",
};

const WELCOME = [
  "Fireballs, lightning, curses and epic magical battles",
  "Spooky fantasy: skeletons, dark lords, shadow magic",
  "Trash talk aimed at your rival's wizard",
  "Silly and gross-out jokes (the storyteller keeps them tasteful)",
  "Sweet, silly romance: love potions, charm spells, Cupid's arrows",
  "Characters and ideas from your favorite books, games and movies",
];

const NOT_ALLOWED = [
  "Swearing, including disguised spellings",
  "Anything sexual, including innuendo",
  "Hateful words about real groups of people",
  "Gory or gruesome descriptions",
  "Bullying or threatening a real person",
  "Self-harm",
  "Personal details: addresses, phone numbers, schools, real names",
  "Trying to trick the AI into breaking the game's rules",
];

const SAFEGUARDS = [
  {
    icon: Filter,
    title: "Everything is checked before anyone sees it",
    text: "Every spell, wizard name and description, and every username and display name a player chooses is checked when it's submitted. If it breaks the rules, it's rejected and never shown to anyone.",
  },
  {
    icon: BrainCircuit,
    title: "Two layers of checking",
    text: "A word filter catches known bad words, including tricks like swapped letters and symbols. Then an AI moderator reads the text in context. It knows a fireball in a fantasy duel is fine, and it catches innuendo, bullying and attempts to sneak something past it.",
  },
  {
    icon: Feather,
    title: "The storyteller follows the same rules",
    text: "The AI that narrates each duel and creates its illustrations is instructed to keep everything PG-13. Crude jokes are softened, and if anything inappropriate ever slipped through, the storyteller drops it and the spell fails.",
  },
  {
    icon: UserCheck,
    title: "Repeat offenders are stopped, and we review them",
    text: "Each rejected attempt is a strike. Too many in a short time and a player is locked out of writing for a while. Every rejection is logged for our team to review.",
  },
];

const FACTS = [
  {
    icon: MessageSquareOff,
    title: "No chat or private messages",
    text: "Players can't message each other. They only meet through duels, and everything in a duel passes through the checks above.",
  },
  {
    icon: Globe,
    title: "Duels between players are public",
    text: "Anyone can watch player duels on the Watch page, which keeps them out in the open. Campaign battles against AI wizards aren't listed.",
  },
  {
    icon: Coins,
    title: "Simple, one-time purchases",
    text: "The game runs on tokens: one token per duel, with free tokens to start. There are no subscriptions, and tokens never expire.",
  },
];

export default function RulesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 sm:py-12">
      <PageHeader
        title="Arena Rules & Safety"
        description="AI Wizard Duel is built to be fun for players of all ages. Everything on it stays within a PG-13 rating. Here's what that means, and how we keep it that way."
        icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
      />

      <section aria-labelledby="rules-heading" className="mb-14">
        <h2 id="rules-heading" className="mb-2 font-display text-2xl font-bold">
          The Arena Rules
        </h2>
        <p className="mb-6 text-muted-foreground">
          If you can describe it, you can usually cast it. Just keep it fit for
          everyone watching.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Welcome in the arena</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {WELCOME.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check
                      className="mt-0.5 size-5 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Not allowed</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
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
        </div>
        <p className="mt-6 text-muted-foreground">
          Break a rule and the Watcher, the arena&apos;s silent guardian, will
          stop the spell before it&apos;s cast. Nothing is spent, and you can
          rewrite it and try again. Keep testing the Watcher&apos;s patience and
          your magic will be silenced for a while.
        </p>
      </section>

      <section aria-labelledby="parents-heading" className="mb-14">
        <h2
          id="parents-heading"
          className="mb-2 font-display text-2xl font-bold"
        >
          For Parents
        </h2>
        <p className="mb-6 text-muted-foreground">
          Players write their own spells, so we check everything they write. You
          shouldn&apos;t have to wonder what your child might see.
        </p>
        <ol className="space-y-4">
          {SAFEGUARDS.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card>
                <CardContent className="flex gap-4 py-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-arcane text-white shadow-md shadow-primary/30">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      <span className="sr-only">Step {i + 1}: </span>
                      {title}
                    </h3>
                    <p className="mt-1 text-muted-foreground">{text}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <h3 className="mt-10 mb-4 font-display text-xl font-bold">
          Good to know
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {FACTS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardContent className="space-y-2 py-5">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          An honest note: no filter is perfect, and AI can make mistakes in
          either direction. That&apos;s why we use several layers, keep the
          storyteller under the same rules, and review every rejection
          ourselves. We keep improving the checks as we learn.
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
