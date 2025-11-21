import { SignedIn, SignedOut, SignInButton, PricingTable } from "@clerk/nextjs";
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
            <h1 className="text-6xl font-bold mb-6 text-white font-[family-name:var(--font-cinzel)]">
              AI Wizard Duel
            </h1>
            <p className="text-2xl text-white mb-4">
              Where Wizards Clash and Legends Rise!
            </p>
            <SignedOut>
              <Link href="/waitlist">
                <Button
                  size="lg"
                  className="text-lg drop-shadow-xl mb-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Join Waitlist
                </Button>
              </Link>
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
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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
              <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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
              <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
                Epic Magical Battles
              </h2>
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
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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

      {/* Image Credits System */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Coins className="w-12 h-12 mb-4 text-yellow-500 inline-block" />
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
              Bring Your Spells to Life
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Every duel features stunning AI-generated artwork that visualizes
              your magical creations. Use image credits to generate unique
              illustrations for your spells and wizards.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Gift}
              title="Free Credits"
              description="Start with 10 free image credits when you sign up. Perfect for trying out the magic!"
            />
            <FeatureCard
              icon={Sparkles}
              title="Earn More Credits"
              description="Watch short video ads to earn additional credits. One ad = one credit, with a 5-minute cooldown."
            />
            <FeatureCard
              icon={Crown}
              title="Unlimited with Premium"
              description="Premium users get unlimited image generation plus exclusive features and faster processing."
            />
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              <strong>Want to play without using credits?</strong> You can
              always duel in text-only mode, which focuses purely on the magical
              storytelling without AI-generated images.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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
            <PricingTable
              appearance={{
                elements: {
                  pricingTable: "bg-transparent",
                  pricingTableCard:
                    "border border-border bg-card text-card-foreground shadow-sm rounded-lg",
                  pricingTableCardHeader: "text-center p-6",
                  pricingTableCardTitle: "text-2xl font-bold",
                  pricingTableCardPrice: "text-3xl font-bold mt-2",
                  pricingTableCardDescription: "text-muted-foreground mt-1",
                  pricingTableCardFeatures: "space-y-3 p-6",
                  pricingTableCardFeature: "flex items-center gap-3",
                  pricingTableCardButton:
                    "w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200",
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-secondary/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Get started in minutes and begin your magical journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-purple-600">1</span>
              </div>
              <h3 className="text-xl font-semibold font-[family-name:var(--font-cinzel)]">
                Sign Up Free
              </h3>
              <p className="text-muted-foreground">
                Create your account and get 10 free image credits to start
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold font-[family-name:var(--font-cinzel)]">
                Create Your Wizard
              </h3>
              <p className="text-muted-foreground">
                Design your magical character with AI-generated artwork
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="text-xl font-semibold font-[family-name:var(--font-cinzel)]">
                Cast Spells
              </h3>
              <p className="text-muted-foreground">
                Enter duels and cast creative spells against other wizards
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-yellow-600">4</span>
              </div>
              <h3 className="text-xl font-semibold font-[family-name:var(--font-cinzel)]">
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
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
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
                  <div className="flex text-yellow-400">{"★".repeat(5)}</div>
                  <p className="text-muted-foreground italic">
                    &ldquo;The creativity this game unleashes is incredible!
                    I&apos;ve never had so much fun coming up with magical
                    spells. The AI artwork makes every duel feel like an epic
                    fantasy movie.&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
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
                  <div className="flex text-yellow-400">{"★".repeat(5)}</div>
                  <p className="text-muted-foreground italic">
                    &ldquo;Way better than rock-paper-scissors! My friends and I
                    use this to settle everything now. The simultaneous spell
                    casting keeps everyone on their toes. So much fun!&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
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
                  <div className="flex text-yellow-400">{"★".repeat(5)}</div>
                  <p className="text-muted-foreground italic">
                    &ldquo;The free tier is generous enough to really enjoy the
                    game, but Premium is totally worth it for unlimited image
                    generation. The AI creates such beautiful and unique
                    artwork!&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
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
          <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
            Leaderboard
          </h2>
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

      {/* FAQ */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about AI Wizard Duel
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  What are image credits?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Image credits are used to generate AI artwork for your spells
                  and wizards. Each duel with images consumes 1 credit. You
                  start with 10 free credits and can earn more by watching ads
                  or upgrade to Premium for unlimited generation.
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
                  Absolutely! The game is completely free to play. You can
                  create wizards, participate in unlimited duels, and earn
                  additional image credits by watching short video ads. Premium
                  is optional and adds convenience and extra features.
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
          <h2 className="text-3xl font-bold mb-6 font-[family-name:var(--font-cinzel)]">
            Begin Your Magical Journey
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Step into a world where your magical creativity knows no bounds.
            Join other wizards in creating spectacular magical duels that push
            the boundaries of imagination.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/duels/watch">
              <Button variant="outline" size="lg">
                Watch Duels
              </Button>
            </Link>
            <SignedOut>
              <Link href="/waitlist">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Join Waitlist
                </Button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 transform hover:scale-105 transition-all duration-200"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>
    </div>
  );
}
