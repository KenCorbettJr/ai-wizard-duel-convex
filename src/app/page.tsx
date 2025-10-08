import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <DashboardContent />
      </SignedIn>
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
      <section className="hero bg-gradient-to-b from-background to-secondary/30 dark:from-background dark:to-secondary relative">
        <div className="absolute inset-0 hero-gradient" />
        <div className="container mx-auto h-[95vh] relative z-10 flex items-end">
          <div className="text-center max-w-2xl mx-auto p-4 mt-96">
            <h1 className="text-6xl font-bold mb-6 text-white">
              AI Wizard Duel
            </h1>
            <p className="text-2xl text-white mb-6">
              Where Wizards Clash and Legends Rise!
            </p>
            <SignedOut>
              <SignInButton>
                <Button
                  size="lg"
                  className="text-lg drop-shadow-xl mb-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Dueling
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/">
                <Button
                  size="lg"
                  className="text-lg drop-shadow-xl mb-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Dueling
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Unique Gameplay Mechanics */}
      <section className="bg-background py-16 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">
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
              <h2 className="text-3xl font-bold mb-6">
                Only Limited By Your Imagination
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Create spells that go beyond traditional magic. Summon mythical
                creatures, bend the elements, or invent entirely new forms of
                magic. Whatever you decide, our AI brings your creative spells
                to life weaving them into an epic tale.
              </p>
              <div className="grid grid-cols-2 gap-4">
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
            <h2 className="text-3xl font-bold mb-6">
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
      <section className="bg-secondary/30 dark:bg-secondary py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <DuelExample
              imageUrl="/images/epic-duel.jpeg"
              description="Two wizards locked in an epic battle of light and shadow"
            />
            <div>
              <h2 className="text-3xl font-bold mb-6">Epic Magical Battles</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Every duel tells a unique story. Cast spells that interact in
                unexpected ways, create magical chain reactions, and experience
                battles that unfold like chapters in a fantasy novel.
              </p>
              <div className="grid grid-cols-2 gap-4">
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
            <h2 className="text-3xl font-bold mb-6">Fun and Hilarious Duels</h2>
            <p className="text-lg text-muted-foreground mb-8">
              AI Wizard Duel isn&apos;t just about strategy and creativity;
              it&apos;s also about having fun! The unpredictable nature of
              simultaneous spellcasting often leads to hilarious and unexpected
              outcomes. Challenge your friends to a wizard duel and experience a
              better way to settle disputes!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                emoji="😂"
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

      {/* Leaderboard */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 mb-4 text-primary inline-block" />
          <h2 className="text-3xl font-bold mb-6">Leaderboard</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            See who&apos;s mastering the arcane arts! Our leaderboard tracks the
            most successful wizards. Climb the ranks, earn recognition, and
            perhaps one day your name will be whispered with awe throughout the
            magical realm.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/leaderboard">
              <Button variant="outline" size="lg">
                Check Out Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Begin Your Magical Journey
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Step into a world where your magical creativity knows no bounds.
            Join other wizards in creating spectacular magical duels that push
            the boundaries of imagination.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/duels/watch">
              <Button variant="outline" size="lg">
                Watch Duels
              </Button>
            </Link>
            <SignedOut>
              <SignInButton>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Dueling
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Start Dueling
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>
    </div>
  );
}
