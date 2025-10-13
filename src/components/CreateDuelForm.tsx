"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "./ConvexImage";
import { ImageCreditDisplay } from "./ImageCreditDisplay";
import {
  Loader2,
  Image as ImageIcon,
  Type,
  AlertTriangle,
  Info,
} from "lucide-react";
import Image from "next/image";

interface CreateDuelFormProps {
  onClose: () => void;
  onSuccess: (duelId: Id<"duels">) => void;
  preSelectedWizardId?: Id<"wizards">;
}

export function CreateDuelForm({
  onClose,
  onSuccess,
  preSelectedWizardId,
}: CreateDuelFormProps) {
  const { user } = useUser();
  const [selectedWizard, setSelectedWizard] = useState<Id<"wizards"> | null>(
    preSelectedWizardId || null
  );
  const [numberOfRounds, setNumberOfRounds] = useState<number | "TO_THE_DEATH">(
    3
  );
  const [enableImageGeneration, setEnableImageGeneration] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wizards = useQuery(api.wizards.getUserWizards, user?.id ? {} : "skip");

  // Check if user has credits for image generation
  const hasImageCredits = useQuery(
    api.imageCreditService.hasImageCreditsForDuel,
    user?.id ? { userId: user.id } : "skip"
  );

  // Get user info to check if premium
  const userInfo = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const createDuel = useMutation(api.duels.createDuel);

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

  const handleWizardSelect = (wizardId: Id<"wizards">) => {
    setSelectedWizard(wizardId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedWizard) return;

    setIsCreating(true);
    setError(null);
    try {
      const duelId = await createDuel({
        numberOfRounds,
        wizards: [selectedWizard],
        enableImageGeneration,
      });
      onSuccess(duelId);
    } catch (error) {
      console.error("Failed to create duel:", error);
      setError("Failed to create duel. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const isPremium =
    userInfo?.subscriptionTier === "PREMIUM" &&
    userInfo?.subscriptionStatus === "ACTIVE";

  const shouldShowCreditWarning =
    enableImageGeneration && !isPremium && !hasImageCredits;

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
        <CardTitle>⚔️ Create New Duel</CardTitle>
        <CardDescription>
          Set up a magical battle and wait for opponents to join
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {isCreating && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Creating your duel...</span>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Your Wizard
            </label>
            <div className="grid grid-cols-1 gap-3">
              {wizards.map((wizard) => (
                <div
                  key={wizard._id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedWizard === wizard._id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => handleWizardSelect(wizard._id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Wizard Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      {wizard.illustration ? (
                        <ConvexImage
                          storageId={wizard.illustration}
                          alt={wizard.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : wizard.illustrationURL ? (
                        <Image
                          src={wizard.illustrationURL}
                          alt={wizard.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          {wizard.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Wizard Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">
                        {wizard.name}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {wizard.description}
                      </p>
                    </div>

                    {/* Stats and Selection Indicator */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {wizard.wins || wizard.losses ? (
                        <Badge variant="outline">
                          {wizard.wins || 0}W - {wizard.losses || 0}L
                        </Badge>
                      ) : (
                        <Badge variant="secondary">New</Badge>
                      )}
                      {selectedWizard === wizard._id && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                      <ImageIcon className="h-5 w-5 text-purple-500" />
                    ) : (
                      <Type className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">
                        {enableImageGeneration
                          ? "Images Enabled"
                          : "Text-Only Mode"}
                      </span>
                      {enableImageGeneration && !isPremium && (
                        <Badge variant="outline" className="text-xs">
                          Uses 1 credit
                        </Badge>
                      )}
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

              {/* Credit Information */}
              {enableImageGeneration && (
                <div className="space-y-3">
                  {isPremium ? (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-lg">
                      <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm text-purple-700 dark:text-purple-300">
                        Premium: Unlimited image generation included
                      </span>
                    </div>
                  ) : hasImageCredits ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                      <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        This duel will use 1 of your image credits
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                            No image credits available
                          </p>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            Your duel will automatically switch to text-only
                            mode. You can earn credits by watching ads or
                            upgrading to Premium.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  className={`p-3 border rounded-lg text-center transition-all ${
                    numberOfRounds === rounds
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                      : "border-border hover:border-muted-foreground"
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
                className={`p-3 border rounded-lg text-center transition-all ${
                  numberOfRounds === "TO_THE_DEATH"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setNumberOfRounds("TO_THE_DEATH")}
              >
                <div className="font-medium text-foreground">To the Death</div>
                <div className="text-sm text-muted-foreground">
                  Until one falls
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!selectedWizard || isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Duel...
                </>
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
    </Card>
  );
}
