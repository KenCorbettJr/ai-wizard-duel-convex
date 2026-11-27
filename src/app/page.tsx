import { Show } from "@clerk/nextjs";
import {
  STARTING_TOKENS,
  TOKEN_PACKS,
  TO_THE_DEATH_MAX_ROUNDS,
  formatCentsPerDuel,
  formatPrice,
} from "../../convex/lib/pricing";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import HeroWizardCard from "@/components/HeroWizardCard";
import HeroWizardForm from "@/components/HeroWizardForm";
import RoundReplay from "@/components/RoundReplay";
import TopWizards from "@/components/TopWizards";
import HighlightedDuels from "@/components/HighlightedDuels";
import CampaignShowcase from "@/components/CampaignShowcase";
import {
  ChevronDown,
  Coins,
  Crown,
  Eye,
  Gem,
  Image as ImageIcon,
  Laugh,
  PenLine,
  Share2,
  Sparkles,
  Swords,
  Trophy,
  Wand2,
  Zap,
} from "lucide-react";
import Image from "next/image";
import StickySignupBar from "@/components/StickySignupBar";
import type { Metadata } from "next";
import DashboardContent from "@/components/DashboardContent";
import { CREATE_WIZARD_SIGN_UP_URL } from "@/lib/pendingWizard";

export const metadata: Metadata = {
  title: "AI Wizard Duel: Create Your Wizard, Send Them Into Battle",
  description:
    "Describe any wizard you can imagine and AI generates their portrait. Then send them into duels against friends, rivals and a ten-wizard campaign, with every battle narrated and illustrated by AI.",
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

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "Do I get to keep my wizard?",
    a: "Yes. Your wizard stays on your account with their portrait, their win-loss record and any relics they earn. Before each duel you choose which of your wizards to send in.",
  },
  {
    q: "Is it free to start?",
    a: `Yes. Sign up and you get ${STARTING_TOKENS} free tokens, enough for that many duels or campaign battles. You can also watch public duels without an account. Buy more tokens only if you want them.`,
  },
  {
    q: "How do I win a duel?",
    a: (
      <>
        Knock your rival down to 0 health and you win on the spot. If both
        wizards are still standing after the last round, the one with the most
        points wins, even if they have less health left. The AI judge awards
        points each round for clever, creative spells. Health only breaks a
        points tie.{" "}
        <Link
          href="/rules#how-to-win"
          className="text-primary underline-offset-4 hover:underline"
        >
          See how scoring works
        </Link>
        .
      </>
    ),
  },
  {
    q: "Is there a limit to what I can cast, and is it fair?",
    a: "Cast anything you can describe. The AI scores creativity and strategy, and each wizard also gets a luck roll, so a clever spell can beat a bigger one and nobody wins on size alone.",
  },
  {
    q: "Is it safe for kids?",
    a: (
      <>
        Yes. Everything stays PG-13. Every spell, wizard and username is checked
        by a word filter and an AI moderator before anyone sees it, and the AI
        storyteller follows the same rules. There are no private messages: duel
        chat is short, checked the same way, and either player can turn it off.{" "}
        <Link
          href="/rules"
          className="text-primary underline-offset-4 hover:underline"
        >
          See the rules and how moderation works
        </Link>
        .
      </>
    ),
  },
  {
    q: "Can other people see my duels?",
    a: "Yes. Player duels appear on the public Watch page so anyone can follow along. Campaign battles against AI wizards are not listed.",
  },
  {
    q: "Can I pay for a friend to play?",
    a: "Yes. When you create a duel, turn on \u201cCover my opponent\u2019s entry\u201d and you pay both tokens. Your friend joins from your link without spending any.",
  },
];

const LEGEND_STEPS = [
  {
    icon: PenLine,
    title: "Describe them",
    text: "A grumpy owl archmage. A pirate who duels with soup. A librarian who weaponizes bookmarks. Their look, their quirks, their kind of magic: it's all up to you.",
  },
  {
    icon: ImageIcon,
    title: "Watch them come to life",
    text: "The AI generates a portrait of the wizard you imagined. Your first portrait is free.",
  },
  {
    icon: Swords,
    title: "Battle as your champion",
    text: "The AI puts your wizard into every duel scene it generates, so they look like themselves round after round. Every win, loss and relic stays with them.",
  },
];

const LEGEND_TRAITS = [
  { icon: ImageIcon, label: "Same face in every battle" },
  { icon: Trophy, label: "Their own win-loss record" },
  { icon: Crown, label: "A spot on the leaderboard" },
  { icon: Gem, label: "Relics they earn and keep" },
];

function ArtCard({
  image,
  icon: Icon,
  title,
  text,
  children,
}: {
  image: string;
  icon: typeof Zap;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="group relative isolate min-h-64 overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/30">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="-z-10 object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/95 via-black/60 to-black/10" />
      <div className="flex h-full min-h-64 flex-col justify-end p-6">
        {children}
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-arcane text-white shadow-md shadow-primary/40 ring-1 ring-white/20">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h3 className="mb-1 font-display text-2xl font-bold text-white">
          {title}
        </h3>
        <p className="text-white/80">{text}</p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50">
        <Navbar transparent landing />
      </div>

      {/* Hero Section */}
      <section
        className="hero relative"
        style={{ backgroundBlendMode: "normal" }}
      >
        <div className="absolute inset-0 hero-gradient" />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.55)_40%,rgba(0,0,0,0.25))] lg:bg-[radial-gradient(ellipse_45%_40%_at_28%_50%,rgba(0,0,0,0.45),transparent_75%)]"
        />
        <div className="container relative z-10 mx-auto grid min-h-[88vh] items-center gap-10 px-4 pt-24 pb-14 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="text-center lg:text-left">
            <h1 className="mb-5 font-display text-4xl font-bold text-white sm:text-6xl [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
              Create Your Wizard.{" "}
              <span className="text-gold-gradient">Send Them Into Battle.</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-lg text-white/90 sm:text-xl lg:mx-0">
              Describe any wizard you can dream up. The AI generates their
              portrait, and they become your champion in every duel, building a
              record and a reputation.
            </p>
            <HeroWizardForm />
            <p className="mt-3 text-sm text-white/85">
              Free account, {STARTING_TOKENS} duels and your first portrait
              free. No card needed.
            </p>
            <p className="mt-3 text-sm">
              <Link
                href="/duels/watch"
                className="inline-flex items-center gap-1 font-semibold text-white underline underline-offset-4"
              >
                <Eye className="size-4" aria-hidden="true" />
                Or watch a duel, no signup
              </Link>
            </p>
          </div>
          <div className="mx-auto w-full max-w-xl">
            <HeroWizardCard />
          </div>
        </div>
      </section>

      {/* A wizard's story */}
      <section className="bg-background py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl">
              From a Few Words to a Legend
            </h2>
            <p className="text-lg text-muted-foreground">
              Your wizard isn&apos;t a character you play once and forget.
              They&apos;re yours: the face you send into every duel and the name
              that climbs the leaderboard.
            </p>
          </div>
          <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {LEGEND_STEPS.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-xl shadow-black/20"
              >
                <div className="relative aspect-video bg-[oklch(0.17_0.05_285)]">
                  {i === 0 && (
                    <div className="flex h-full items-center p-5">
                      <p className="text-lg italic leading-snug text-amber-100">
                        &ldquo;A clumsy, good-hearted wizard whose spells
                        backfire in spectacular ways. He never, ever gives
                        up.&rdquo;
                      </p>
                    </div>
                  )}
                  {i === 1 && (
                    <Image
                      src="/images/wizards/boris.jpg"
                      alt="Bumbling Boris, a wizard in a tall blue hat surrounded by misfiring sparkles and a startled rubber duck"
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  )}
                  {i === 2 && (
                    <ul className="grid h-full grid-cols-2 content-center gap-2 p-4">
                      {LEGEND_TRAITS.map((trait) => (
                        <li
                          key={trait.label}
                          className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs font-medium leading-tight text-white/90 ring-1 ring-white/10"
                        >
                          <trait.icon
                            className="size-4 shrink-0 text-amber-300"
                            aria-hidden
                          />
                          {trait.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-arcane text-sm font-bold text-white ring-2 ring-amber-300/50">
                      {i + 1}
                    </span>
                    <h3 className="font-display text-xl font-bold">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="gold" className="text-base">
              <Link href={CREATE_WIZARD_SIGN_UP_URL}>
                <Wand2 aria-hidden="true" />
                Create My Wizard
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top wizards (hidden until the leaderboard has entries) */}
      <TopWizards />

      {/* Example duel */}
      <section className="relative overflow-hidden bg-[oklch(0.15_0.04_285)] pt-14 pb-10 sm:pt-20 sm:pb-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.5_0.22_293/0.3),transparent_55%)]"
        />
        <div className="container relative mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-sky-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-200">
              <Sparkles className="size-3.5" aria-hidden />
              Try a round
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-display">
              Then the Duel Begins
            </h2>
            <p className="text-lg text-white/75">
              In battle, your wizard fights with spells you write in secret.
              Your rival has already cast. Pick your counter and see how the AI
              tells the story.
            </p>
          </div>
          <RoundReplay />
          <p className="mt-8 text-center">
            <Link
              href="/duels/watch"
              className="inline-flex items-center gap-2 font-semibold text-white/85 underline underline-offset-4 hover:text-white"
            >
              <Eye className="size-4" aria-hidden="true" />
              Or watch a real AI-narrated duel
            </Link>
          </p>
        </div>
      </section>

      {/* Admin-picked duels (hidden until some are highlighted) */}
      <HighlightedDuels />

      {/* Ways to play + how it works */}
      <section className="bg-background py-14 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-display">
              Duel Friends and Rivals
            </h2>
            <p className="text-lg text-muted-foreground">
              No rules to memorize. If you can describe it, your wizard can cast
              it.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <ArtCard
              image="/images/epic-duel.jpeg"
              icon={Share2}
              title="Challenge a Friend by Link"
              text="Your friend casts from their phone, you cast from yours, and you both watch it come to life. You can even cover their entry."
            >
              <div
                aria-hidden
                className="mb-auto flex items-center gap-2 self-end rounded-xl border border-white/20 bg-black/60 p-1.5 pl-3 text-sm shadow-lg backdrop-blur-md"
              >
                <span className="truncate font-mono text-white/80">
                  …/join/K7QX2M
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-300 px-2.5 py-1 text-xs font-bold text-amber-950">
                  <Share2 className="size-3" />
                  Copy link
                </span>
              </div>
            </ArtCard>
            <ArtCard
              image="/images/demo/spell-mirrors.jpg"
              icon={Laugh}
              title="Clever Beats Big"
              text="A thousand tiny mirrors versus an ice phoenix. The AI scores creativity and strategy first, then the dice decide."
            />
          </div>
        </div>
      </section>

      {/* Campaign */}
      <CampaignShowcase />

      {/* Pricing */}
      <section
        id="pricing"
        className="relative isolate overflow-hidden py-14 sm:py-20 scroll-mt-20"
      >
        <Image
          src="/images/duel-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover opacity-25"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-background via-background/70 to-background" />
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Coins
              className="w-12 h-12 mb-4 text-gold inline-block"
              aria-hidden="true"
            />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-display">
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
          <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-amber-300/50 bg-amber-300/10 p-6 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-display text-2xl font-bold">
                Start with {STARTING_TOKENS} free duels
              </p>
              <p className="text-muted-foreground">
                No card needed. Packs are only for when you want more.
              </p>
            </div>
            <Button asChild size="lg" variant="gold" className="shrink-0">
              <Link href={CREATE_WIZARD_SIGN_UP_URL}>
                <Zap aria-hidden="true" />
                Sign Up Free
              </Link>
            </Button>
          </div>
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Want more after that?
          </p>
          <ul className="mx-auto flex max-w-3xl flex-col items-center gap-x-8 gap-y-1 text-lg sm:flex-row sm:justify-center">
            {TOKEN_PACKS.map((pack) => (
              <li key={pack.id} className="whitespace-nowrap">
                <b>{formatPrice(pack.priceCents)}</b>{" "}
                <span className="text-muted-foreground">
                  · {pack.tokens} duels
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Duels can be 3 or 5 rounds, or To the Death (up to{" "}
            {TO_THE_DEATH_MAX_ROUNDS} rounds). You&apos;re only charged when a
            duel starts, and cancelled duels are refunded.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative bg-[oklch(0.17_0.05_288)] py-14 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.5_0.22_293/0.22),transparent_60%)]"
        />
        <div className="container mx-auto px-4">
          <h2 className="relative text-3xl sm:text-4xl font-bold mb-10 text-center font-display">
            Questions, Answered
          </h2>
          <div className="relative mx-auto max-w-3xl divide-y rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group px-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold sm:text-lg">
                  {faq.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="pb-5 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        id="final-cta"
        className="relative isolate overflow-hidden py-24 text-white"
      >
        <Image
          src="/images/duel-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.12_0.04_285)]/80" />
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-bold mb-4 font-display">
            Your First {STARTING_TOKENS} Duels Are Free.
            <br />
            <span className="text-gold-gradient">Who Will Your Wizard Be?</span>
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Describe a wizard no one has ever imagined and see what the AI
            generates.
          </p>
          <HeroWizardForm
            id="final-cta-wizard"
            className="mx-auto w-full max-w-xl"
          />
          <p className="mt-4">
            <Link
              href="/duels/watch"
              className="inline-flex items-center gap-2 font-semibold text-white/85 underline underline-offset-4 hover:text-white"
            >
              <Eye className="size-4" aria-hidden="true" />
              Watch a duel first
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t bg-background py-10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row">
          <span className="font-display text-base font-bold text-foreground">
            AI Wizard Duel
          </span>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/duels/watch" className="hover:text-foreground">
              Watch Duels
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground">
              Leaderboard
            </Link>
            <Link href="/#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/rules" className="hover:text-foreground">
              Rules &amp; Safety
            </Link>
            <Link href="/sponsor" className="hover:text-foreground">
              Sponsor the Duels
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/sign-in" className="hover:text-foreground">
              Sign In
            </Link>
          </nav>
        </div>
      </footer>

      <StickySignupBar freeDuels={STARTING_TOKENS} />
    </div>
  );
}
