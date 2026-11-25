"use client";

import { HowToWinDialog } from "@/components/HowToWinDialog";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { WizardSelectionCard } from "./WizardSelectionCard";
import { ProfileCompletionPrompt } from "./ProfileCompletionPrompt";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import {
  Image as ImageIcon,
  Type,
  AlertTriangle,
  Info,
  Gift,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import {
  DUEL_TOKEN_COST,
  TO_THE_DEATH_MAX_ROUNDS,
} from "../../convex/lib/pricing";
import posthog from "posthog-js";
import { ConvexError } from "convex/values";

interface CreateDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
  preSelectedWizardId?: Id<"wizards">;
  /** Challenge this wizard directly: only its owner can accept the duel. */
  opponentWizardId?: Id<"wizards">;
}

export function CreateDuelForm({
  onClose,
  onSuccess,
  preSelectedWizardId,
  opponentWizardId,
}: CreateDuelFormProps) {
  const { user } = useUser();
  const router = useRouter();
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    preSelectedWizardId || null,
  );
  const [numberOfRounds, setNumberOfRounds] = useState<number | "TO_THE_DEATH">(
    3,
  );
  const [enableImageGeneration, setEnableImageGeneration] = useState(true);
  const [coverOpponentEntry, setCoverOpponentEntry] = useState(false);
  const [enableChat, setEnableChat] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { isProfileComplete, getProfileCompletionPrompt } =
    useProfileCompletion();

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  const tokenBalance = useQuery(
    api.imageCreditService.getUserImageCredits,
    user?.id ? { userId: user.id } : "skip",
  );

  // Entering a duel costs 1 token (legacy Premium subscribers are included)
  const hasImageCredits = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? { userId: user.id } : "skip",
  );

  // Get user info to check if premium
  const userInfo = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip",
  );

  const createDuel = useMutation(api.duels.createDuel);
  const challengeWizard = useMutation(api.duels.challengeWizard);
  const opponent = useQuery(
    api.wizards.getWizard,
    opponentWizardId ? { wizardId: opponentWizardId } : "skip",
  );
  const isChallenge = !!opponentWizardId;

  // Auto-select first wizard if only one exists and none is pre-selected
  useEffect(() => {
    if (
      wizards &&
      wizards.length === 1 &&
      !selectedWizard &&
      !preSelectedWizardId
    ) {
      setSelectedWizard(wizards[0]._id);
    }
  }, [wizards, selectedWizard, preSelectedWizardId]);

  const handleWizardSelect = (wizardId: string) => {
    setSelectedWizard(wizardId as Id<"wizards">);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedWizard) return;

    // Check if profile is complete before creating duel
    if (!isProfileComplete) {
      setShowProfilePrompt(true);
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const settings = {
        numberOfRounds,
        enableImageGeneration,
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
          image_generation_enabled: enableImageGeneration,
          covers_opponent_entry: coversEntry,
        },
      );
      onSuccess(duelId);
    } catch (error) {
      console.error("Failed to create duel:", error);
      setError(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : isChallenge
            ? "Failed to send the challenge. Please try again."
            : "Failed to create duel. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const isPremium =
    userInfo?.subscriptionTier === "PREMIUM" &&
    userInfo?.subscriptionStatus === "ACTIVE";

  const canAffordCover =
    isPremium || (tokenBalance ?? 0) >= DUEL_TOKEN_COST * 2;
  const coversEntry = coverOpponentEntry && canAffordCover;

  const profilePrompt = getProfileCompletionPrompt("create duels");

  if (!wizards || wizards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create New Duel</CardTitle>
          <CardDescription>
            You need at least one wizard to create a duel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Create a wizard first before starting a duel.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/wizards")} className="flex-1">
              Create Wizard
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>
          {isChallenge
            ? `⚔️ Challenge ${opponent?.name ?? "a Wizard"}`
            : "⚔️ Create New Duel"}
        </CardTitle>
        <CardDescription>
          {isChallenge
            ? "Pick your wizard and the rules. Their owner can accept or decline."
            : "Set up a magical battle, then invite your opponent with a QR code or link"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isCreating && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <RuneSpinner size="md" label="Creating your duel…" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Your Wizard
            </label>
            <div className="grid grid-cols-1 gap-3">
              {wizards?.map((wizard: Doc<"wizards">) => (
                <WizardSelectionCard
                  key={wizard._id}
                  wizardData={{ wizard }}
                  isSelected={selectedWizard === wizard._id}
                  onSelect={handleWizardSelect}
                  variant="compact"
                />
              ))}
            </div>
            {!selectedWizard && (
              <p className="text-sm text-destructive mt-1">
                Please select a wizard
              </p>
            )}
          </div>

          {/* Image Generation Settings */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Image Generation
            </label>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {enableImageGeneration ? (
                      <ImageIcon className="h-5 w-5 text-primary" />
                    ) : (
                      <Type className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {enableImageGeneration
                          ? "Images Enabled"
                          : "Text-Only Mode"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {enableImageGeneration
                        ? "Generate AI illustrations for your duel rounds"
                        : "Duel will use text descriptions only"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableImageGeneration}
                  onCheckedChange={setEnableImageGeneration}
                />
              </div>

              {/* Duelist chat */}
              <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <MessageCircle
                    className={`h-5 w-5 flex-shrink-0 ${enableChat ? "text-primary" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="enable-duel-chat"
                      className="font-medium text-foreground"
                    >
                      Duel chat
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {enableChat
                        ? "You and your opponent can trade words during the duel. Either of you can turn it off."
                        : "No messages between duelists. Watchers can still react."}
                    </p>
                  </div>
                </div>
                <Switch
                  id="enable-duel-chat"
                  checked={enableChat}
                  onCheckedChange={setEnableChat}
                />
              </div>

              {/* Gift the opponent's entry */}
              <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Gift
                    className={`h-5 w-5 flex-shrink-0 ${coversEntry ? "text-gold" : "text-muted-foreground"}`}
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="cover-opponent-entry"
                      className="font-medium text-foreground"
                    >
                      Cover my opponent&apos;s entry
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {canAffordCover
                        ? "Pay 1 extra token so your friend can play without spending one."
                        : "You need 2 tokens to cover your opponent's entry."}
                    </p>
                  </div>
                </div>
                <Switch
                  id="cover-opponent-entry"
                  checked={coversEntry}
                  disabled={!canAffordCover}
                  onCheckedChange={setCoverOpponentEntry}
                />
              </div>

              {/* Token Information */}
              <div className="space-y-3">
                {isPremium ? (
                  <div className="flex items-center gap-2 p-3 bg-primary/8 border border-primary/30 rounded-lg">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary">
                      Premium: duels are included
                    </span>
                  </div>
                ) : hasImageCredits ? (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/40 rounded-lg">
                    <Info className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">
                      {coversEntry
                        ? "This duel costs you 2 tokens: yours and your opponent's."
                        : "This duel costs 1 token, whatever its length."}{" "}
                      You&apos;re only charged when your opponent joins.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-warning/10 border border-warning/40 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm text-warning font-medium">
                          No tokens available
                        </p>
                        <p className="text-sm text-warning">
                          You need 1 token to start a duel.{" "}
                          <Link
                            href="/credits"
                            className="font-medium underline underline-offset-2"
                          >
                            Get more tokens
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Duel Length
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[3, 5, 10].map((rounds) => (
                <button
                  key={rounds}
                  type="button"
                  aria-pressed={numberOfRounds === rounds}
                  className={`p-3 border rounded-lg text-center transition-all min-h-11 focus-visible:ring-2 focus-visible:ring-ring ${
                    numberOfRounds === rounds
                      ? "border-primary bg-primary/10 ring-1 ring-gold/60"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setNumberOfRounds(rounds)}
                >
                  <div className="font-medium text-foreground">
                    {rounds} Rounds
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {rounds === 3
                      ? "Quick"
                      : rounds === 5
                        ? "Standard"
                        : "Epic"}
                  </div>
                </button>
              ))}
              <button
                type="button"
                aria-pressed={numberOfRounds === "TO_THE_DEATH"}
                className={`p-3 border rounded-lg text-center transition-all min-h-11 focus-visible:ring-2 focus-visible:ring-ring ${
                  numberOfRounds === "TO_THE_DEATH"
                    ? "border-primary bg-primary/10 ring-1 ring-gold/60"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setNumberOfRounds("TO_THE_DEATH")}
              >
                <div className="font-medium text-foreground">To the Death</div>
                <div className="text-sm text-muted-foreground">
                  Until one falls (max {TO_THE_DEATH_MAX_ROUNDS})
                </div>
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A knockout wins instantly. Otherwise, the most points after the
              last round wins.{" "}
              <HowToWinDialog>
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  How to win
                </button>
              </HowToWinDialog>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={
                !selectedWizard || isCreating || hasImageCredits === false
              }
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <RuneSpinner size="xs" label="Working…" className="mr-2" />
                  {isChallenge ? "Sending Challenge..." : "Creating Duel..."}
                </>
              ) : isChallenge ? (
                "Send Challenge"
              ) : (
                "Create Duel"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>

      <ProfileCompletionPrompt
        open={showProfilePrompt}
        onOpenChange={setShowProfilePrompt}
        title={profilePrompt.title}
        message={profilePrompt.message}
        actionLabel={profilePrompt.actionLabel}
        onAction={profilePrompt.onAction}
        isSignInPrompt={!user?.id}
      />
    </Card>
  );
}
