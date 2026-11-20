import { Show } from "@clerk/nextjs";
import { TokenPacks } from "@/components/TokenPacks";
import {
  STARTING_TOKENS,
  TOKEN_PACKS,
  TO_THE_DEATH_MAX_ROUNDS,
  formatCentsPerDuel,
  formatPrice,
} from "../../convex/lib/pricing";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";
import DuelExample from "@/components/DuelExample";
import {
  Brain,
  Flame,
  Sparkles,
  Map,
  MessageCircle,
  Timer,
  ShieldPlus,
  ScanHeart,
  Trophy,
  Zap,
  Coins,
  Gift,
  Swords,
  Crown,
  Laugh,
  Infinity as InfinityIcon,
} from "lucide-react";
import type { Metadata } from "next";
import DashboardContent from "@/components/DashboardContent";

export const metadata: Metadata = {
  title: "AI Wizard Duel",
  description:
    "Where Wizards Clash and Legends Rise! Create magical spells, duel other wizards, and experience epic battles brought to life by AI.",
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
        <div className="container mx-auto h-[95vh] relative z-10 flex items-end">
          <div className="text-center max-w-2xl mx-auto p-4 mt-[40vh]">
            <h1 className="mb-6 text-5xl font-bold text-white font-display sm:text-6xl">
              AI Wizard Duel
            </h1>
            <p className="text-2xl text-white mb-4">
              Where Wizards Clash and Legends Rise!
            </p>
            <p className="text-lg text-white/90 mb-6">
              Duel other players, or take on a ten-wizard campaign to earn a
              permanent relic.
            </p>
            <p className="text-sm text-white/80 mb-6">
              {STARTING_TOKENS} free duels to start, then from{" "}
              {formatCentsPerDuel(TOKEN_PACKS[TOKEN_PACKS.length - 1])} a duel.{" "}
              <Link href="#pricing" className="underline underline-offset-2">
                See pricing
              </Link>
            </p>
            <Show when="signed-out">
              <Button
                asChild
                size="lg"
                variant="gold"
                className="mb-12 text-lg"
              >
                <Link href="/waitlist">
                  <Zap aria-hidden="true" />
                  Join Waitlist
                </Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button
                asChild
                size="lg"
                variant="gold"
                className="mb-12 text-lg"
              >
                <Link href="/">
                  <Zap aria-hidden="true" />
                  Start Dueling
                </Link>
              </Button>
            </Show>
          </div>
        </div>
      </section>

      {/* Unique Gameplay Mechanics */}
      <section className="bg-background py-16 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Unique Gameplay Mechanics
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              In AI Wizard Duel, both wizards submit their spells without
              knowing what the other wizard will do. The spells are then
              narrated as if they both happened at the same time, creating a
              dynamic and unpredictable battle experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={Map}
                title="Strategic Planning"
                description="Plan your spells carefully, as you won't know your opponent's moves until it's too late!"
              />
              <FeatureCard
                icon={Timer}
                title="Simultaneous Actions"
                description="Experience the thrill of simultaneous spellcasting, where every decision counts."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Campaign */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Not Ready for Players? Take On the Campaign
            </h2>
            <p className="text-lg text-muted-foreground">
              Face ten AI-powered wizards in order, from gentle apprentices to
              archmages. Beat them all to earn a permanent relic that boosts
              your luck in every duel, no other player required.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Trophy}
              title="Ten Opponents"
              description="Beginner, intermediate and advanced wizards, each with their own personality and spell style."
            />
            <FeatureCard
              icon={Crown}
              title="Earn a Relic"
              description="Win the full campaign for a lasting Luck bonus that follows your wizard into every duel."
            />
            <FeatureCard
              icon={Coins}
              title="One Token a Battle"
              description={`Every battle costs one token, win or lose. Start with ${STARTING_TOKENS} free, and retry a lost fight whenever you like.`}
            />
          </div>
        </div>
      </section>

      {/* Creative Freedom */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 font-display">
                Only Limited By Your Imagination
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Create spells that go beyond traditional magic. Summon mythical
                creatures, bend the elements, or invent entirely new forms of
                magic. Whatever you decide, our AI brings your creative spells
                to life weaving them into an epic tale.
              </p>
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <FeatureCard
                  icon={Brain}
                  title="Creative Freedom"
                  description="Cast any spell that your mind can imagine! The more creative, the better!"
                />
                <FeatureCard
                  icon={Flame}
                  title="Dynamic Storytelling"
                  description="The spells of both wizards are woven into an epic tale of magic and wonder."
                />
              </div>
            </div>
            <DuelExample
              imageUrl="/images/ice-phoenix.jpeg"
              description="A phoenix made of crystalline ice"
            />
          </div>
        </div>
      </section>

      {/* Points and Hit Points */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Master the Art of Magical Combat
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Victory in AI Wizard Duel requires more than raw power. It demands
              strategy, timing, and creative thinking. The goal is simple, earn
              more points than your opponent while making sure you don&apos;t
              run out of hit points!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={ScanHeart}
                title="Strategic Point System"
                description="Earn points for effective spells, but try not to die in the process!"
              />
              <FeatureCard
                icon={ShieldPlus}
                title="Balance Offense and Defense"
                description="Use both offensive and defensive magic to outlast your opponent."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Epic Battles */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <DuelExample
              imageUrl="/images/epic-duel.jpeg"
              description="Two wizards locked in an epic battle of light and shadow"
            />
            <div>
              <h2 className="text-3xl font-bold mb-6 font-display">
                Epic Magical Battles
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Every duel tells a unique story. Cast spells that interact in
                unexpected ways, create magical chain reactions, and experience
                battles that unfold like chapters in a fantasy novel.
              </p>
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                <FeatureCard
                  icon={Sparkles}
                  title="Magical Synergies"
                  description="Combine spells for powerful effects"
                />
                <FeatureCard
                  icon={MessageCircle}
                  title="Dynamic Narration"
                  description="Every spell adds to a riveting tale of magic and wonder."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fun and Hilarious */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Fun and Hilarious Duels
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              AI Wizard Duel isn&apos;t just about strategy and creativity;
              it&apos;s also about having fun! The unpredictable nature of
              simultaneous spellcasting often leads to hilarious and unexpected
              outcomes. Challenge your friends to a wizard duel and experience a
              better way to settle disputes!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={Laugh}
                title="Unpredictable Outcomes"
                description="Because anything can happen in a wizard duel, the results are often hilariously entertaining!"
              />
              <FeatureCard
                emoji="🪨 📃 ✂️"
                title="Better Than Rock-Paper-Scissors"
                description="Dueling is a fun and magical way to challenge your friends and see who is the better wizard!"
              />
            </div>
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
            <h2 className="text-3xl font-bold mb-6 font-display">
              Simple Arcade Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              <strong className="text-foreground">One token = one duel.</strong>{" "}
              Any length, any opponent, AI artwork included. No subscription.
              Buy a bigger pack and every duel costs less, from{" "}
              {formatCentsPerDuel(TOKEN_PACKS[0])} down to{" "}
              {formatCentsPerDuel(TOKEN_PACKS[TOKEN_PACKS.length - 1])}.
            </p>
          </div>
          <TokenPacks mode="display" className="mx-auto max-w-5xl" />
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Gift}
              title={`${STARTING_TOKENS} Free Tokens`}
              description={`Every new wizard starts with ${STARTING_TOKENS} free tokens. That's ${STARTING_TOKENS} duels or campaign battles to try the magic.`}
            />
            <FeatureCard
              icon={Swords}
              title="Cover a Friend"
              description="Challenging someone new? Pay their token when you create the duel and they play free."
            />
            <FeatureCard
              icon={InfinityIcon}
              title="Tokens Never Expire"
              description="You're only charged when a duel actually starts, and cancelled duels are refunded."
            />
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Duels can be 3, 5 or 10 rounds, or To the Death (up to{" "}
            {TO_THE_DEATH_MAX_ROUNDS} rounds). Story-only duels without images
            cost the same 1 token.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-display">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in minutes and begin your magical journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-arcane rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-2 ring-gold/50">
                <span className="text-2xl font-bold font-display text-white">
                  1
                </span>
              </div>
              <h3 className="text-xl font-semibold font-display">
                Sign Up Free
              </h3>
              <p className="text-muted-foreground">
                Create your account and get {STARTING_TOKENS} free tokens to
                start
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-arcane rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-2 ring-gold/50">
                <span className="text-2xl font-bold font-display text-white">
                  2
                </span>
              </div>
              <h3 className="text-xl font-semibold font-display">
                Create Your Wizard
              </h3>
              <p className="text-muted-foreground">
                Design your magical character with AI-generated artwork
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-arcane rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-2 ring-gold/50">
                <span className="text-2xl font-bold font-display text-white">
                  3
                </span>
              </div>
              <h3 className="text-xl font-semibold font-display">
                Cast Spells
              </h3>
              <p className="text-muted-foreground">
                Enter duels and cast creative spells against other wizards
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-arcane rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/30 ring-2 ring-gold/50">
                <span className="text-2xl font-bold font-display text-white">
                  4
                </span>
              </div>
              <h3 className="text-xl font-semibold font-display">
                Watch Magic Unfold
              </h3>
              <p className="text-muted-foreground">
                See your spells come to life with AI-generated stories and
                images
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 mb-4 text-primary inline-block" />
          <h2 className="text-3xl font-bold mb-6 font-display">Leaderboard</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            See who&apos;s mastering the arcane arts! Our leaderboard tracks the
            most successful wizards. Climb the ranks, earn recognition, and
            perhaps one day your name will be whispered with awe throughout the
            magical realm.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild variant="outline" size="lg">
              <Link href="/leaderboard">Check Out Leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about AI Wizard Duel
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are tokens?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Tokens are how you play. Each player spends 1 token to enter a
                  duel, whatever its length, and 1 token starts a campaign
                  battle. The AI story and artwork are included. You start with{" "}
                  {STARTING_TOKENS} free tokens.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  How much does it cost?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Signing up is free and comes with {STARTING_TOKENS} tokens.
                  After that, tokens come in packs:{" "}
                  {TOKEN_PACKS.map(
                    (pack) =>
                      `${pack.tokens} for ${formatPrice(pack.priceCents)}`,
                  ).join(", ")}
                  . That&apos;s {formatCentsPerDuel(TOKEN_PACKS[0])} a duel or
                  less. There&apos;s no subscription, and tokens never expire.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How do duels work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Both wizards submit their spells simultaneously without
                  knowing what the other will cast. Our AI then weaves both
                  spells into an epic narrative, determining the outcome based
                  on creativity, strategy, and a touch of magical luck!
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

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Is there a limit to creativity?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Not at all! Cast any spell your imagination can conjure.
                  Summon mythical creatures, manipulate elements, bend reality,
                  or invent entirely new forms of magic. The more creative and
                  unique your spells, the more engaging the battle becomes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 font-display">
            Begin Your Magical Journey
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Step into a world where your magical creativity knows no bounds.
            Join other wizards in creating spectacular magical duels that push
            the boundaries of imagination.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button asChild variant="outline" size="lg">
              <Link href="/duels/watch">Watch Duels</Link>
            </Button>
            <Show when="signed-out">
              <Button asChild size="lg">
                <Link href="/waitlist">
                  <Zap aria-hidden="true" />
                  Join Waitlist
                </Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild size="lg">
                <Link href="/dashboard">
                  <Zap aria-hidden="true" />
                  Go to Dashboard
                </Link>
              </Button>
            </Show>
          </div>
        </div>
      </section>
    </div>
  );
}
