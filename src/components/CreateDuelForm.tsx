"use client";

import { HowToWinDialog } from "@/components/HowToWinDialog";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { ConvexImage } from "./ConvexImage";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import {
  AlertTriangle,
  Check,
  Coins,
  Flame,
  Gift,
  MessageCircle,
  Skull,
  Sparkles,
  Sword,
  Swords,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useSponsorship } from "./SponsorBanner";
import Image from "next/image";
import Link from "next/link";
import {
  DUEL_TOKEN_COST,
  TO_THE_DEATH_MAX_ROUNDS,
} from "../../convex/lib/pricing";
import posthog from "posthog-js";
import { ConvexError } from "convex/values";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { DEPARTED_OWNER } from "../../convex/lib/departed";

interface CreateDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
  preSelectedWizardId?: Id<"wizards">;
  /** Challenge this wizard directly: only its owner can accept the duel. */
  opponentWizardId?: Id<"wizards">;
  /** The link asked for a challenge but its wizard id was malformed. */
  brokenChallengeLink?: boolean;
}

type DuelLength = number | "TO_THE_DEATH";

// A knockout ends any duel early, so a fixed 10-round option would play
// exactly like To the Death (capped at TO_THE_DEATH_MAX_ROUNDS).
const LENGTHS: {
  value: DuelLength;
  title: string;
  icon: LucideIcon;
  /** Shown in the matchup card: what kind of fight this is... */
  flavor: string;
  /** ...and how it's won. */
  rule: string;
  deadly?: boolean;
}[] = [
  {
    value: 3,
    title: "3 Rounds",
    icon: Zap,
    flavor: "Quick and brutal",
    rule: "Knock them out, or outscore them in 3 rounds",
  },
  {
    value: 5,
    title: "5 Rounds",
    icon: Sword,
    flavor: "Room for strategy",
    rule: "Knock them out, or most points after 5 rounds",
  },
  {
    value: "TO_THE_DEATH",
    flavor: "Only one walks away",
    rule: `Fight until one falls. Points decide it after ${TO_THE_DEATH_MAX_ROUNDS} rounds`,
    title: "To the Death",
    icon: Skull,
    deadly: true,
  },
];

const tokens = (n: number) => `${n} token${n === 1 ? "" : "s"}`;

type PortraitWizard = Pick<
  Doc<"wizards">,
  "name" | "illustration" | "illustrationURL" | "illustrationStatus"
>;

/** A wizard's portrait, or their initial while it is still being painted. */
function WizardPortrait({
  wizard,
  size,
  className,
  decorative = false,
  priority = false,
}: {
  wizard: PortraitWizard;
  size: number;
  className?: string;
  /** The name is already shown next to it, so screen readers skip the image. */
  decorative?: boolean;
  /** Above the fold: load first so the entrance animation shows the art. */
  priority?: boolean;
}) {
  const alt = decorative ? "" : wizard.name;
  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-xl bg-muted",
        className,
      )}
    >
      {wizard.illustration ? (
        <ConvexImage
          storageId={wizard.illustration}
          alt={alt}
          width={size * 2}
          height={size * 2}
          sizes={`${size}px`}
          priority={priority}
          className="h-full w-full object-cover"
        />
      ) : wizard.illustrationURL ? (
        <Image
          src={wizard.illustrationURL}
          alt={alt}
          width={size * 2}
          height={size * 2}
          priority={priority}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-arcane text-2xl font-bold text-white"
        >
          {wizard.name.charAt(0).toUpperCase()}
        </div>
      )}
      {(wizard.illustrationStatus === "sketching" ||
        wizard.illustrationStatus === "painting") && (
        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-xs font-medium text-white">
          Painting…
        </span>
      )}
    </div>
  );
}

function Record({
  wizard,
}: {
  wizard: Pick<Doc<"wizards">, "wins" | "losses">;
}) {
  const wins = wizard.wins ?? 0;
  const losses = wizard.losses ?? 0;
  return (
    <p className="text-xs text-muted-foreground">
      {wins || losses ? `${wins}W · ${losses}L` : "Untested"}
    </p>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true">
      <div className="mb-4 flex items-start gap-3 sm:mb-8">
        <div className="size-11 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-9 w-1/2 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      </div>
      <div className="h-52 rounded-2xl bg-muted" />
      <div className="h-24 rounded-xl bg-muted" />
      <div className="h-14 rounded-lg bg-muted" />
    </div>
  );
}

function EmptyState({
  title,
  message,
  action,
  wizard,
}: {
  title: string;
  message: string;
  action: React.ReactNode;
  /** The rival waiting at the other end, when there is one. */
  wizard?: PortraitWizard;
}) {
  return (
    <Card className="rune-card">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        {wizard ? (
          <WizardPortrait
            wizard={wizard}
            size={112}
            decorative
            priority
            className="w-28 ring-2 ring-destructive/50"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-2xl bg-arcane text-white shadow-md shadow-primary/30">
            <Swords className="size-7" aria-hidden="true" />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">{message}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function CreateDuelForm({
  onClose,
  onSuccess,
  preSelectedWizardId,
  opponentWizardId,
  brokenChallengeLink = false,
}: CreateDuelFormProps) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRounds = searchParams.get("rounds");

  const [pickedWizard, setPickedWizard] = useState<Id<"wizards"> | null>(
    preSelectedWizardId || null,
  );
  const [numberOfRounds, setNumberOfRounds] = useState<DuelLength>(() =>
    initialRounds === "TO_THE_DEATH"
      ? "TO_THE_DEATH"
      : LENGTHS.some((l) => String(l.value) === initialRounds)
        ? Number(initialRounds)
        : 3,
  );
  const [coverOpponentEntry, setCoverOpponentEntry] = useState(
    searchParams.get("cover") === "1",
  );
  const [enableChat, setEnableChat] = useState(
    searchParams.get("chat") !== "0",
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLFieldSetElement>(null);
  const changeChampionRef = useRef<HTMLButtonElement>(null);
  // On phones the picker opens below the fold, behind the pinned button
  useEffect(() => {
    if (pickerOpen) {
      pickerRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [pickerOpen]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isProfileComplete, isProfileLoaded } = useProfileCompletion();

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  const tokenBalance = useQuery(
    api.imageCreditService.getUserImageCredits,
    user?.id ? {} : "skip",
  );

  // Entering a duel costs 1 token
  const hasImageCredits = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? {} : "skip",
  );

  // A running sponsorship makes this player's entry free
  const sponsorship = useSponsorship();

  const createDuel = useMutation(api.duels.createDuel);
  const challengeWizard = useMutation(api.duels.challengeWizard);
  // getWizard only returns our own wizards; a challenge targets someone else's
  const opponent = useQuery(
    api.wizards.getWizardWithOwner,
    opponentWizardId ? { wizardId: opponentWizardId } : "skip",
  );
  const isChallenge = !!opponentWizardId;
  // An existing challenge to this wizard, or too many out already
  const challengeBlocker = useQuery(
    api.duels.getChallengeBlocker,
    opponentWizardId && user?.id ? { opponentWizardId } : "skip",
  );

  // Newest wizard first: it's usually the one a player is excited to try
  const sortedWizards = wizards
    ? [...wizards].sort((a, b) => b._creationTime - a._creationTime)
    : undefined;

  // Always have a champion ready. Ignore a ?wizardId= that isn't ours.
  const selectedWizard =
    (pickedWizard && wizards?.some((w) => w._id === pickedWizard)
      ? pickedWizard
      : null) ??
    sortedWizards?.[0]?._id ??
    null;

  const canAffordCover = (tokenBalance ?? 0) >= DUEL_TOKEN_COST * 2;
  const sponsored = sponsorship?.coversYou === true;
  // Nothing to gift while a sponsor pays everyone's entry
  const coversEntry = coverOpponentEntry && canAffordCover && !sponsored;
  const outOfTokens = !sponsored && hasImageCredits === false;
  const needsProfile = isProfileLoaded && !isProfileComplete;
  // This page with the current choices, so detours come back to them
  const here = (() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedWizard) params.set("wizardId", selectedWizard);
    params.set("rounds", String(numberOfRounds));
    params.set("chat", enableChat ? "1" : "0");
    if (coverOpponentEntry) params.set("cover", "1");
    else params.delete("cover");
    return `${pathname}?${params.toString()}`;
  })();
  const returnHere = `redirect_url=${encodeURIComponent(here)}`;
  // Coming back from making a wizard, the newest one (the new one) is picked
  const returnHereFresh = `redirect_url=${encodeURIComponent(
    here.replace(/([?&])wizardId=[^&]*&?/, "$1").replace(/[?&]$/, ""),
  )}`;
  const profileSetupHref = `/profile/setup?${returnHere}`;
  // Hold the commit area steady until everything it depends on has loaded
  const commitReady =
    isProfileLoaded &&
    sponsorship !== undefined &&
    hasImageCredits !== undefined &&
    tokenBalance !== undefined &&
    (!isChallenge || challengeBlocker !== undefined);
  const cost = coversEntry ? DUEL_TOKEN_COST * 2 : DUEL_TOKEN_COST;

  // A failed attempt's message stops applying once the player changes things
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      setError(null);
      set(value);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedWizard || !commitReady || needsProfile) return;

    setIsCreating(true);
    setError(null);
    try {
      const settings = {
        numberOfRounds,
        coverOpponentEntry: coversEntry,
        enableChat,
      };
      const duelId = opponentWizardId
        ? await challengeWizard({
            ...settings,
            wizardId: selectedWizard,
            opponentWizardId,
          })
        : await createDuel({ ...settings, wizards: [selectedWizard] });
      posthog.capture(
        opponentWizardId ? "duel_challenge_sent" : "duel_created",
        {
          chat_enabled: enableChat,
          round_count: numberOfRounds,
          covers_opponent_entry: coversEntry,
        },
      );
      // Let the charge-up land before leaving for the arena
      await new Promise((resolve) => setTimeout(resolve, 700));
      onSuccess(duelId);
    } catch (error) {
      console.error("Failed to create duel:", error);
      setError(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : isChallenge
            ? "The challenge didn't go through. Please try again."
            : "The arena didn't open. Please try again.",
      );
      setIsCreating(false);
    }
  };

  if (
    !isUserLoaded ||
    (isChallenge && opponent === undefined) ||
    (isChallenge && user && challengeBlocker === undefined)
  ) {
    return <FormSkeleton />;
  }

  const unchallengeable =
    !!opponent &&
    (!!opponent.isCampaignOpponent ||
      opponent.owner === "campaign" ||
      opponent.owner === DEPARTED_OWNER);
  if (
    brokenChallengeLink ||
    (isChallenge && (opponent === null || unchallengeable))
  ) {
    const campaign =
      !!opponent &&
      (!!opponent.isCampaignOpponent || opponent.owner === "campaign");
    return (
      <EmptyState
        title={
          brokenChallengeLink
            ? "This challenge link is broken"
            : campaign
              ? "Campaign wizards only fight in the Campaign"
              : "That wizard has left the realm"
        }
        message={
          brokenChallengeLink
            ? "Find the wizard again and challenge them from their page, or open a duel anyone can join."
            : campaign
              ? "Take them on in the Campaign, or open a duel against another player."
              : "They can't be challenged anymore. Open a duel instead and invite anyone."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="lg">
              <Link href="/duels/create">
                <Swords aria-hidden="true" />
                Open a Duel
              </Link>
            </Button>
            {campaign && (
              <Button asChild size="lg" variant="outline">
                <Link href="/campaign">Go to the Campaign</Link>
              </Button>
            )}
          </div>
        }
      />
    );
  }

  if (!user) {
    return (
      <EmptyState
        title={
          opponent ? `Sign in to challenge ${opponent.name}` : "Sign in to duel"
        }
        message="Bring your wizard into the arena. Sign in and you'll come right back here."
        wizard={opponent ?? undefined}
        action={
          <Button asChild size="lg">
            <Link href={`/sign-in?${returnHere}`}>Sign In</Link>
          </Button>
        }
      />
    );
  }

  if (wizards === undefined) {
    return <FormSkeleton />;
  }

  if (isChallenge && opponent && opponent.owner === user.id) {
    return (
      <EmptyState
        title="That's your own wizard"
        message="Your wizards can't fight each other. Open a duel and invite a rival."
        action={
          <Button asChild size="lg">
            <Link href="/duels/create">
              <Swords aria-hidden="true" />
              Open a Duel
            </Link>
          </Button>
        }
      />
    );
  }

  if (wizards.length === 0) {
    return (
      <EmptyState
        title={
          isChallenge && opponent
            ? `Summon a wizard to face ${opponent.name}`
            : "Every duel needs a champion"
        }
        wizard={opponent ?? undefined}
        message={
          isChallenge
            ? "Create your wizard and you'll come right back to this challenge."
            : "Summon your first wizard, then come back to fight."
        }
        action={
          <Button asChild size="lg">
            <Link href={`/wizards/create?${returnHere}`}>
              <Sparkles aria-hidden="true" />
              Create a Wizard
            </Link>
          </Button>
        }
      />
    );
  }

  // Our own challenge shows up as "already challenged" the moment it's sent,
  // so ignore the blocker while sending
  const blocker = isCreating ? null : challengeBlocker;
  // Nothing can be sent, so the choices are frozen
  const locked = isCreating || !!blocker;
  // While a challenge is pending, show the wizard actually in it
  const championId =
    blocker?.kind === "alreadyChallenged" ? blocker.wizardId : selectedWizard;
  const champion =
    wizards.find((w) => w._id === championId) ??
    wizards.find((w) => w._id === selectedWizard) ??
    null;
  const length = LENGTHS.find((l) => l.value === numberOfRounds) ?? LENGTHS[0];
  const deadly = !!length.deadly;

  return (
    <>
      <PageHeader
        title={
          isChallenge && opponent
            ? `Challenge ${opponent.name}`
            : "Enter the Arena"
        }
        description={
          blocker
            ? undefined
            : "Pick your champion and the rules of engagement."
        }
        descriptionClassName="hidden sm:block"
        icon={<Swords className="h-6 w-6" aria-hidden="true" />}
        compactOnMobile
        className="mb-4 sm:mb-8"
      />
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* The matchup: who's stepping into the arena */}
        <section
          aria-label="Matchup"
          className={cn(
            "rune-card relative overflow-hidden rounded-2xl border p-5 transition-colors sm:p-6",
            deadly && "border-destructive/50",
          )}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-6">
            <div className="create-duel-in-left flex min-w-0 flex-col items-center gap-1.5 text-center">
              {champion && (
                <div
                  key={champion._id}
                  className={cn(
                    "create-duel-pop w-28 rounded-xl sm:w-36",
                    isCreating && "create-duel-glow",
                  )}
                >
                  <WizardPortrait
                    wizard={champion}
                    size={144}
                    decorative
                    priority
                    className="w-full ring-2 ring-primary/60"
                  />
                </div>
              )}
              <p
                title={champion?.name}
                className="line-clamp-2 font-display text-sm font-semibold sm:line-clamp-1 sm:text-base"
              >
                {champion?.name}
              </p>
              {champion && <Record wizard={champion} />}
              {champion?.description && (
                <p className="hidden text-xs italic text-muted-foreground sm:line-clamp-2">
                  {champion.description}
                </p>
              )}
              {wizards.length > 1 && !blocker && (
                <button
                  ref={changeChampionRef}
                  type="button"
                  aria-expanded={pickerOpen}
                  aria-controls={pickerOpen ? "champion-picker" : undefined}
                  disabled={locked}
                  onClick={() => setPickerOpen((open) => !open)}
                  className="mt-1 min-h-11 rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pickerOpen ? "Done" : "Change champion"}
                </button>
              )}
            </div>

            {/* Level with the middle of the portraits (w-28 / sm:w-36) */}
            <div className="mt-9 flex flex-col items-center sm:mt-[52px]">
              <span
                className={cn(
                  "inline-block",
                  isCreating && "create-duel-charge",
                )}
              >
                <span
                  className={cn(
                    "create-duel-stamp inline-block font-display text-3xl font-black sm:text-4xl",
                    deadly ? "text-destructive" : "text-gold-gradient",
                  )}
                >
                  VS
                </span>
              </span>
            </div>

            <div className="create-duel-in-right flex min-w-0 flex-col items-center gap-1.5 text-center">
              {isChallenge && opponent ? (
                <>
                  <div
                    className={cn(
                      "w-28 rounded-xl sm:w-36",
                      isCreating && "create-duel-glow",
                    )}
                  >
                    <WizardPortrait
                      wizard={opponent}
                      size={144}
                      decorative
                      priority
                      className="w-full ring-2 ring-destructive/50"
                    />
                  </div>
                  <p
                    title={opponent.name}
                    className="line-clamp-2 font-display text-sm font-semibold sm:line-clamp-1 sm:text-base"
                  >
                    {opponent.name}
                  </p>
                  <Record wizard={opponent} />
                  {opponent.description && (
                    <p className="hidden text-xs italic text-muted-foreground sm:line-clamp-2">
                      {opponent.description}
                    </p>
                  )}
                  {(opponent.ownerUserId || opponent.ownerDisplayName) && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {opponent.ownerUserId
                        ? `@${opponent.ownerUserId}`
                        : `by ${opponent.ownerDisplayName}`}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div
                    aria-hidden="true"
                    className="create-duel-await flex aspect-square w-28 items-center justify-center rounded-xl border-2 border-dashed border-warning/60 font-display text-4xl text-warning sm:w-36 dark:border-gold/50 dark:text-gold"
                  >
                    ?
                  </div>
                  <p className="font-display text-sm font-semibold sm:text-base">
                    Your rival
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Anyone can join · you&apos;ll get a link
                  </p>
                  <Link
                    href="/duels/lobby"
                    className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Or Quick Match now →
                  </Link>
                </>
              )}
            </div>
          </div>
          {/* Duel length: the stakes live in the card */}
          {!blocker && (
            <fieldset disabled={locked} className="mt-5 min-w-0">
              <legend className="sr-only">Duel length</legend>
              <div
                role="radiogroup"
                aria-label="Duel length"
                className="grid grid-cols-3 gap-2 sm:gap-3"
                onKeyDown={(e) => {
                  const step =
                    e.key === "ArrowRight" || e.key === "ArrowDown"
                      ? 1
                      : e.key === "ArrowLeft" || e.key === "ArrowUp"
                        ? -1
                        : 0;
                  if (!step) return;
                  e.preventDefault();
                  const i = LENGTHS.findIndex(
                    (l) => l.value === numberOfRounds,
                  );
                  const next = (i + step + LENGTHS.length) % LENGTHS.length;
                  changed(setNumberOfRounds)(LENGTHS[next].value);
                  const buttons =
                    e.currentTarget.querySelectorAll<HTMLButtonElement>(
                      "[role=radio]",
                    );
                  buttons[next]?.focus();
                }}
              >
                {LENGTHS.map(({ value, title, icon: Icon, deadly }) => {
                  const selected = numberOfRounds === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => changed(setNumberOfRounds)(value)}
                      className={cn(
                        "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border bg-background/60 p-2.5 text-center transition-all focus-visible:ring-2 focus-visible:ring-ring sm:p-3",
                        selected
                          ? deadly
                            ? "border-destructive bg-destructive/10 ring-2 ring-destructive/60"
                            : "border-primary bg-primary/10 ring-2 ring-gold/70"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5",
                          selected
                            ? deadly
                              ? "text-destructive"
                              : "text-gold"
                            : "text-muted-foreground",
                        )}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-semibold leading-tight sm:text-base">
                        {title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
          {!blocker && (
            <p
              key={String(length.value)}
              className={cn(
                "create-duel-pop mt-4 text-center font-display text-lg font-semibold",
                deadly ? "text-destructive" : "text-gold-gradient",
              )}
            >
              {length.flavor}
            </p>
          )}
          {!blocker && (
            <p className="text-center text-xs text-muted-foreground">
              {length.rule} · same price, any length
            </p>
          )}
          <p className="mt-1 text-center text-sm text-muted-foreground empty:hidden">
            {isCreating
              ? isChallenge
                ? "Sending your challenge…"
                : "Opening the arena…"
              : blocker
                ? blocker.kind === "alreadyChallenged"
                  ? `You've already challenged ${opponent?.name}. Waiting on their answer.`
                  : `You have ${blocker.max} challenges waiting for an answer.`
                : isChallenge
                  ? "Their owner can accept or decline."
                  : null}
          </p>
        </section>

        {/* Champion picker, tucked away until the player wants to switch */}
        {wizards.length > 1 && pickerOpen && !blocker && (
          <fieldset
            id="champion-picker"
            ref={pickerRef}
            disabled={locked}
            className="min-w-0 scroll-mb-[calc(var(--app-bottomnav-h)+8rem)] md:scroll-mb-40"
          >
            <legend className="mb-3 font-display text-lg font-semibold">
              Choose your champion
            </legend>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 sm:pb-0">
              {(sortedWizards ?? wizards).map((wizard: Doc<"wizards">) => {
                const selected = selectedWizard === wizard._id;
                return (
                  <button
                    key={wizard._id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      changed(setPickedWizard)(wizard._id);
                      setPickerOpen(false);
                      changeChampionRef.current?.focus();
                    }}
                    className={cn(
                      "relative flex w-24 shrink-0 snap-start flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-all focus-visible:ring-2 focus-visible:ring-ring sm:w-auto",
                      selected
                        ? "border-primary bg-primary/10 ring-2 ring-gold/70"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <WizardPortrait
                      wizard={wizard}
                      size={96}
                      decorative
                      className="w-full"
                    />
                    <span className="line-clamp-1 w-full text-sm font-medium">
                      {wizard.name}
                    </span>
                    <Record wizard={wizard} />
                    {selected && (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
              <Link
                href={`/wizards/create?${returnHereFresh}`}
                className="flex w-24 shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed p-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:w-auto"
              >
                <Sparkles className="size-5" aria-hidden="true" />
                New wizard
              </Link>
            </div>
          </fieldset>
        )}

        {/* Secondary options */}
        {!blocker && (
          <fieldset disabled={locked} className="divide-y rounded-xl border">
            <legend className="sr-only">Options</legend>
            <label
              htmlFor="enable-duel-chat"
              className="flex cursor-pointer items-center justify-between gap-3 p-4"
            >
              <span className="flex items-start gap-3">
                <MessageCircle
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    enableChat ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span>
                  <span className="block font-medium">Duel chat</span>
                  <span className="block text-sm text-muted-foreground">
                    {enableChat
                      ? "Trade taunts mid-duel. Either of you can mute it."
                      : "A silent duel. Watchers can still react."}
                  </span>
                </span>
              </span>
              <Switch
                id="enable-duel-chat"
                checked={enableChat}
                onCheckedChange={changed(setEnableChat)}
              />
            </label>
            {tokenBalance !== undefined &&
              sponsorship !== undefined &&
              !sponsored &&
              canAffordCover && (
                <label
                  htmlFor="cover-opponent-entry"
                  className="flex cursor-pointer items-center justify-between gap-3 p-4"
                >
                  <span className="flex items-start gap-3">
                    <Gift
                      className={cn(
                        "mt-0.5 size-5 shrink-0",
                        coversEntry ? "text-gold" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="block font-medium">
                        Pay their way in
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        Spend {tokens(DUEL_TOKEN_COST)} more so your rival plays
                        free.
                      </span>
                    </span>
                  </span>
                  <Switch
                    id="cover-opponent-entry"
                    checked={coversEntry}
                    onCheckedChange={changed(setCoverOpponentEntry)}
                  />
                </label>
              )}
          </fieldset>
        )}

        {/* Commit: pinned to the bottom on phones so it's always in reach */}
        {/* Sits above the mobile tab bar; at md+ (no tab bar) it pins to the bottom */}
        <div className="sticky bottom-[var(--app-bottomnav-h)] z-10 mx-[calc(50%-50vw)] space-y-2 border-t bg-background/90 px-[max(1rem,calc(50vw-50%))] py-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0 md:pb-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              {error}
            </div>
          )}

          {!commitReady ? (
            <Button
              type="button"
              size="lg"
              disabled
              className="h-14 w-full text-lg"
            >
              <RuneSpinner size="xs" label="Loading…" />
            </Button>
          ) : needsProfile ? (
            <>
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
                <UserRound className="size-4 shrink-0" aria-hidden="true" />
                Pick a username first. It&apos;s how rivals will know you.
              </p>
              <Button asChild size="lg" className="h-14 w-full text-lg">
                <Link href={profileSetupHref}>Set Up Profile to Duel</Link>
              </Button>
            </>
          ) : blocker ? (
            blocker.kind === "alreadyChallenged" ? (
              <>
                <Button asChild size="lg" className="h-14 w-full text-lg">
                  <Link href={`/duels/${blocker.duelId}`}>
                    <Flame aria-hidden="true" />
                    View Your Challenge
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Cancel one or wait for an answer before sending another.
                </p>
                <Button asChild size="lg" className="h-14 w-full text-lg">
                  <Link href="/duels">See Your Duels</Link>
                </Button>
              </>
            )
          ) : outOfTokens ? (
            <>
              <p className="flex items-center justify-center gap-1.5 text-center text-sm text-warning">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {(tokenBalance ?? 0) > 0
                  ? "Your open duels already use your tokens. Get more, or wait for one to start."
                  : sponsorship?.entriesLeftToday === 0
                    ? `Your free entries from ${sponsorship.sponsorName} are used or spoken for. Get a token, or come back tomorrow.`
                    : `You need ${tokens(DUEL_TOKEN_COST)} to enter a duel.`}
              </p>
              <Button asChild size="lg" className="h-14 w-full text-lg">
                <Link href={`/credits?${returnHere}`}>
                  <Coins aria-hidden="true" />
                  Get Tokens
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                type="submit"
                size="lg"
                variant={deadly ? "default" : "gold"}
                disabled={!selectedWizard || isCreating}
                className={cn(
                  "h-12 w-full min-w-0 text-lg active:scale-[0.98] md:h-14",
                  isCreating && "create-duel-glow disabled:opacity-100",
                  deadly &&
                    "bg-none bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30 hover:bg-destructive/90",
                )}
              >
                {isCreating ? (
                  <RuneSpinner size="xs" label="Working…" />
                ) : deadly ? (
                  <Skull aria-hidden="true" />
                ) : isChallenge ? (
                  <Flame aria-hidden="true" />
                ) : (
                  <Swords aria-hidden="true" />
                )}
                <span className="truncate">
                  {isCreating
                    ? isChallenge
                      ? "Sending…"
                      : "Opening…"
                    : isChallenge
                      ? "Send the Challenge"
                      : deadly
                        ? "Fight to the Death"
                        : "To Battle!"}
                </span>
                <span className="ml-1 shrink-0 rounded-full bg-black/15 px-2 py-0.5 text-xs font-semibold [text-shadow:none]">
                  {sponsored ? "Free" : tokens(cost)}
                </span>
              </Button>
              <p className="text-center text-xs text-muted-foreground md:text-sm">
                {sponsored && sponsorship ? (
                  <span className="text-warning dark:text-gold">
                    <Sparkles
                      className="mr-1 inline size-3.5 align-[-2px]"
                      aria-hidden="true"
                    />
                    Free from <strong>{sponsorship.sponsorName}</strong>
                    {sponsorship.entriesLeftToday !== null &&
                      ` · uses 1 of your ${sponsorship.entriesLeftToday} free ${
                        sponsorship.entriesLeftToday === 1 ? "entry" : "entries"
                      } when ${isChallenge ? "they accept" : "they join"}`}
                  </span>
                ) : (
                  <>
                    You have {tokens(tokenBalance ?? 0)} · charged only when{" "}
                    {isChallenge ? "they accept" : "they join"}
                  </>
                )}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2 text-sm text-muted-foreground">
          <HowToWinDialog>
            <button
              type="button"
              className="min-h-11 px-2 underline-offset-4 hover:text-foreground hover:underline"
            >
              How to win
            </button>
          </HowToWinDialog>
          {/* Phones have Back in the top bar */}
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="hidden min-h-11 px-2 underline-offset-4 hover:text-foreground hover:underline md:inline"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
