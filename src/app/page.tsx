import { Show } from "@clerk/nextjs";
import { TokenPacks } from "@/components/TokenPacks";
import {
  STARTING_TOKENS,
  TOKEN_PACKS,
  TO_THE_DEATH_MAX_ROUNDS,
  formatCentsPerDuel,
} from "../../convex/lib/pricing";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import DuelExample from "@/components/DuelExample";
import RoundReplay from "@/components/RoundReplay";
import TopWizards from "@/components/TopWizards";
import HighlightedDuels from "@/components/HighlightedDuels";
import {
  Eye,
  Sparkles,
  Trophy,
  Zap,
  Coins,
  Crown,
  Laugh,
  Share2,
} from "lucide-react";
import type { Metadata } from "next";
import DashboardContent from "@/components/DashboardContent";

export const metadata: Metadata = {
  title: "AI Wizard Duel: Type Any Spell, Watch an AI Tell the Story",
  description:
    "Cast any spell you can imagine in secret. An AI narrates both wizards' spells at once, with art. Duel a friend or take on a ten-wizard campaign.",
};

export default function Home() {
  return (
    <>
      <Show when="signed-out">
        <LandingPage />
      </Show>
      <Show when="signed-in">
        <DashboardContent />
      </Show>
    </>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar transparent />
      </div>

      {/* Hero Section */}
      <section className="hero bg-linear-to-b from-background to-secondary/30 dark:from-background dark:to-secondary relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="container mx-auto min-h-[85vh] relative z-10 flex items-end">
          <div className="text-center max-w-2xl mx-auto p-4 pt-40 pb-10">
            <h1 className="mb-6 text-5xl font-bold text-white font-display sm:text-6xl">
              Type Any Spell. An AI Tells the Story.
            </h1>
            <p className="text-xl text-white mb-8">
              You and your rival each write a spell in secret. The AI narrates
              both at once, paints the scene, and decides who walks away.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-3">
              <Button asChild size="lg" variant="gold" className="text-lg">
                <Link href="/sign-up">
                  <Zap aria-hidden="true" />
                  Sign Up Free
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-lg bg-white/10 text-white border-white/40 hover:bg-white/20 hover:text-white"
              >
                <Link href="/duels/watch">
                  <Eye aria-hidden="true" />
                  Watch a Duel, No Signup
                </Link>
              </Button>
            </div>
            <p className="text-sm text-white/80 mb-8">
              Your first {STARTING_TOKENS} duels are on us. No card needed to
              start.
            </p>
            <div className="mx-auto max-w-md">
              <DuelExample
                imageUrl="/images/epic-duel.jpeg"
                description="Every spell you cast becomes an AI-painted scene"
                captionClassName="text-white/80"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Example duel */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl font-bold mb-4 font-display">
              One Round, Two Spells, One Wild Story
            </h2>
            <p className="text-lg text-muted-foreground">
              Wizard A has already cast. Choose your spell, then see what the AI
              does when they collide.
            </p>
          </div>
          <RoundReplay />
          <div className="mx-auto mt-12 max-w-3xl">
            <h3 className="mb-6 text-center text-2xl font-bold font-display">
              Settle Any Argument With Magic
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FeatureCard
                icon={Share2}
                title="Challenge by Link"
                description="Send a link to a friend. Both cast blind, and you can cover their entry so they play free."
              />
              <FeatureCard
                icon={Laugh}
                title="Clever Beats Big"
                description="The AI judges creativity and strategy, then adds a luck roll. A tiny wizard with a giant umbrella can beat a dragon."
              />
            </div>
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/duels/watch"
              className="inline-flex items-center gap-2 font-semibold underline underline-offset-4"
            >
              <Eye className="size-4" aria-hidden="true" />
              Or watch a real AI-narrated duel
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4 font-display">
              From Zero to Casting in Minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              No rules to memorise. If you can describe it, you can cast it.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                title: "Sign Up Free",
                text: `Create your account and get ${STARTING_TOKENS} free tokens to start.`,
              },
              {
                title: "Create Your Wizard",
                text: "Name them, describe them, and get AI-generated artwork.",
              },
              {
                title: "Cast Anything",
                text: "Summon creatures, bend the elements, invent new magic. No spell list.",
              },
              {
                title: "Watch It Unfold",
                text: "Both spells collide in a narrated story with illustrations.",
              },
            ].map((step, i) => (
              <div key={step.title} className="text-center space-y-4">
                <div className="w-16 h-16 bg-arcane rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-2 ring-gold/50">
                  <span className="text-2xl font-bold font-display text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-semibold font-display">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admin-picked duels (hidden until some are highlighted) */}
      <HighlightedDuels />

      {/* Top wizards (hidden until the leaderboard has entries) */}
      <TopWizards />

      {/* Campaign */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl font-bold mb-4 font-display">
              No Friends Online? Fight Ten AI Wizards
            </h2>
            <p className="text-lg text-muted-foreground">
              Climb from gentle apprentices to archmages, each with their own
              personality and spell style. Retry any lost fight; every battle
              costs one token.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Sparkles}
              title="Pip the Apprentice"
              description="“I read the manual, I swear!” Nervous and fumbling, he may be his own worst enemy."
            />
            <FeatureCard
              icon={Trophy}
              title="Shadowweaver Vex"
              description="“Your shadow already works for me.” Mysterious and dangerous. Distrust any spell that looks too easy."
            />
            <FeatureCard
              icon={Crown}
              title="Archmage Eternus"
              description="“I was old when your kingdom was young.” Beat him to earn a relic that boosts your luck in every duel."
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4 font-display">
              Questions, Answered
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is it free to start?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. Sign up and you get {STARTING_TOKENS} free tokens, enough
                  for that many duels or campaign battles. You can also watch
                  public duels without an account. Buy more tokens only if you
                  want them.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a limit to what I can cast, and is it fair?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Cast anything you can describe. The AI scores creativity and
                  strategy, and each wizard also gets a luck roll, so a clever
                  spell can beat a bigger one and nobody wins on size alone.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is it safe for kids?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. Everything stays PG-13. Every spell, wizard and username
                  is checked by a word filter and an AI moderator before anyone
                  sees it, and the AI storyteller follows the same rules. There
                  is no chat between players.{" "}
                  <Link
                    href="/rules"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    See the rules and how moderation works
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can other people see my duels?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. Player duels appear on the public Watch page so anyone
                  can follow along. Campaign battles against AI wizards are not
                  listed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I pay for a friend to play?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. When you create a duel, turn on &ldquo;Cover my
                  opponent&apos;s entry&rdquo; and you pay both tokens. Your
                  friend joins from your link without spending any.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-secondary/30 py-16 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Coins
              className="w-12 h-12 mb-4 text-gold inline-block"
              aria-hidden="true"
            />
            <h2 className="text-3xl font-bold mb-4 font-display">
              Simple Arcade Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              <strong className="text-foreground">One token = one duel.</strong>{" "}
              {STARTING_TOKENS} are free, then{" "}
              {formatCentsPerDuel(TOKEN_PACKS[0])} down to{" "}
              {formatCentsPerDuel(TOKEN_PACKS[TOKEN_PACKS.length - 1])} a duel.
              AI artwork included, no subscription, tokens never expire.
            </p>
          </div>
          <TokenPacks mode="display" className="mx-auto max-w-5xl" />
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Duels can be 3, 5 or 10 rounds, or To the Death (up to{" "}
            {TO_THE_DEATH_MAX_ROUNDS} rounds). You&apos;re only charged when a
            duel starts, and cancelled duels are refunded.
          </p>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 font-display">
            Your First {STARTING_TOKENS} Duels Are Free
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Write a spell no one has thought of yet and see what the AI makes of
            it. Sign up free and start casting.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild variant="outline" size="lg">
              <Link href="/duels/watch">
                <Eye aria-hidden="true" />
                Watch a Duel First
              </Link>
            </Button>
            <Button asChild size="lg" variant="gold">
              <Link href="/sign-up">
                <Zap aria-hidden="true" />
                Sign Up Free
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
