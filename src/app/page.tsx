import { Show } from "@clerk/nextjs";
import { MountedPricingTable } from "@/components/MountedPricingTable";
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
  Crown,
  Laugh,
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

      {/* Image Credits System */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Coins className="w-12 h-12 mb-4 text-gold inline-block" />
            <h2 className="text-3xl font-bold mb-6 font-display">
              Bring Your Spells to Life
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Every duel features stunning AI-generated artwork that visualizes
              your magical creations. Use tokens to generate unique
              illustrations for your spells and wizards.
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Gift}
              title="Free Tokens"
              description="Start with 10 free tokens when you sign up. Perfect for trying out the magic!"
            />
            <FeatureCard
              icon={Sparkles}
              title="Earn More Tokens"
              description="Watch short video ads to earn additional tokens. One ad = one token, with a 5-minute cooldown."
            />
            <FeatureCard
              icon={Crown}
              title="Included with Premium"
              description="Premium players are not charged tokens for duels, plus exclusive features and faster processing."
            />
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              <strong>Prefer a story-only duel?</strong> You can turn off
              AI-generated images when you create a duel. It still costs 1 token
              to enter.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-display">
              Choose Your Path
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free and upgrade when you&apos;re ready to unleash your full
              magical potential.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            {/* 
              Clerk PricingTable component - requires pricing plans to be configured in Clerk Dashboard
              Go to: Clerk Dashboard > Billing > Pricing Plans to set up your plans
              Plans should include:
              1. Free Wizard - $0/month with basic features
              2. Premium Wizard - $9.99/month with unlimited features
            */}
            <MountedPricingTable />
          </div>
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
                Create your account and get 10 free tokens to start
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

      {/* What Players Are Saying */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-display">
              What Players Are Saying
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of wizards already casting spells and having epic
              duels
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div
                    className="flex text-warning"
                    aria-label="5 out of 5 stars"
                    role="img"
                  >
                    {"★".repeat(5)}
                  </div>
                  <p className="text-muted-foreground italic">
                    &ldquo;The creativity this game unleashes is incredible!
                    I&apos;ve never had so much fun coming up with magical
                    spells. The AI artwork makes every duel feel like an epic
                    fantasy movie.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-arcane rounded-full flex items-center justify-center text-white font-bold">
                      M
                    </div>
                    <div>
                      <div className="font-semibold">MysticMage47</div>
                      <div className="text-sm text-muted-foreground">
                        Premium Wizard
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div
                    className="flex text-warning"
                    aria-label="5 out of 5 stars"
                    role="img"
                  >
                    {"★".repeat(5)}
                  </div>
                  <p className="text-muted-foreground italic">
                    &ldquo;Way better than rock-paper-scissors! My friends and I
                    use this to settle everything now. The simultaneous spell
                    casting keeps everyone on their toes. So much fun!&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-arcane rounded-full flex items-center justify-center text-white font-bold">
                      S
                    </div>
                    <div>
                      <div className="font-semibold">SpellSlinger</div>
                      <div className="text-sm text-muted-foreground">
                        Free Wizard
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div
                    className="flex text-warning"
                    aria-label="5 out of 5 stars"
                    role="img"
                  >
                    {"★".repeat(5)}
                  </div>
                  <p className="text-muted-foreground italic">
                    &ldquo;The free tier is generous enough to really enjoy the
                    game, but Premium is totally worth it for unlimited image
                    generation. The AI creates such beautiful and unique
                    artwork!&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-arcane rounded-full flex items-center justify-center text-white font-bold">
                      A
                    </div>
                    <div>
                      <div className="font-semibold">ArcaneArtist</div>
                      <div className="text-sm text-muted-foreground">
                        Premium Wizard
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  Tokens pay for AI-powered duels and artwork. Each player
                  spends 1 token to enter a duel against another player, and 1
                  token starts a campaign battle. You start with 10 free tokens
                  and can earn more by watching ads. Premium players are not
                  charged for duels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Can I play without spending money?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. You start with 10 free tokens and can earn more by
                  watching short video ads. Premium is optional and adds
                  convenience and extra features.
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
                  What makes Premium worth it?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Premium removes all limitations: unlimited image generation,
                  unlimited wizards, faster AI processing, advanced
                  customization options, and an ad-free experience. Perfect for
                  serious wizards who want to duel frequently with stunning
                  visuals.
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
