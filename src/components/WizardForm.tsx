"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, X, Plus, Wand2 } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";
import {
  WatcherDialog,
  type WatcherRejection,
} from "@/components/watcher/WatcherDialog";

/** Tap-to-fill starting points for a player staring at a blank form. */
const EXAMPLE_WIZARDS: WizardFormData[] = [
  {
    name: "Ember Thornwick",
    description:
      "A hot-headed fire mage in a scorched red cloak who hurls comets and laughs at danger. Her staff is a burning branch from a dragon's nest.",
  },
  {
    name: "Professor Glimmerfrost",
    description:
      "An absent-minded ice wizard with a frosty beard and floating spectacles. He freezes time for a heartbeat and traps foes in crystal riddles.",
  },
  {
    name: "Moss the Wanderer",
    description:
      "A quiet druid wrapped in living vines, with a fox familiar on her shoulder. She summons roots, swarms of fireflies and sudden thunderstorms.",
  },
];

interface WizardFormData {
  name: string;
  description: string;
  isAIPowered?: boolean;
}

interface WizardFormProps {
  mode: "create" | "edit";
  initialData?: WizardFormData;
  wizardId?: Id<"wizards">;
  /** Edit mode: redoing an existing portrait costs a token; the first is free. */
  hasPortrait?: boolean;
  onClose: () => void;
  /** Called after a save. Creates pass the new wizard's id. */
  onSuccess: (wizardId?: Id<"wizards">) => void;
  inModal?: boolean;
}

export function WizardForm({
  mode,
  initialData,
  wizardId,
  hasPortrait = false,
  onClose,
  onSuccess,
  inModal = false,
}: WizardFormProps) {
  const { user } = useUser();
  const createWizard = useAction(api.watcher.createWizard);
  const updateWizard = useAction(api.watcher.updateWizard);
  const [watcherRejection, setWatcherRejection] =
    useState<WatcherRejection | null>(null);
  const regenerateIllustration = useMutation(
    api.wizards.regenerateIllustration,
  );

  const [formData, setFormData] = useState<WizardFormData>(
    initialData || {
      name: "",
      description: "",
    },
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing always repaints the portrait, so with nothing changed the one
  // button just redraws it; with changes it saves and redraws.
  const detailsChanged =
    !initialData ||
    formData.name.trim() !== initialData.name.trim() ||
    formData.description.trim() !== initialData.description.trim();
  const redrawOnly = mode === "edit" && !detailsChanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name.trim() || !formData.description.trim())
      return;
    if (redrawOnly) {
      await handleRegenerateIllustration();
      return;
    }

    setIsSubmitting(true);
    try {
      const fields = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };
      const result =
        mode === "create"
          ? await createWizard(fields)
          : wizardId
            ? await updateWizard({ wizardId, ...fields })
            : null;
      if (!result) return;
      if (!result.ok) {
        setWatcherRejection(result.rejection);
        posthog.capture("wizard_rejected_by_watcher", {
          category: result.rejection.category,
          mode,
        });
        return;
      }

      posthog.capture(mode === "create" ? "wizard_created" : "wizard_updated");
      if ("portrait" in result && result.portrait === "redrawing") {
        posthog.capture("wizard_illustration_regenerated", {
          trigger: "details_changed",
        });
      }
      // The caller decides where to go next (create → the new wizard's page,
      // where the portrait paints in).
      onSuccess(
        mode === "create" && "wizardId" in result
          ? (result.wizardId as Id<"wizards">)
          : undefined,
      );
    } catch (error) {
      console.error(
        `Error ${mode === "create" ? "creating" : "updating"} wizard:`,
        error,
      );
      toast.error(
        // Expected problems (like reusing one of your own wizard names)
        // arrive as a ConvexError with a message meant for the player.
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : `Error ${mode === "create" ? "creating" : "updating"} wizard. Please try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateIllustration = async () => {
    if (!wizardId) return;

    setIsSubmitting(true);
    try {
      await regenerateIllustration({ wizardId });
      posthog.capture("wizard_illustration_regenerated", {
        trigger: "button",
      });
      // Back to the wizard's page, where the new portrait paints in.
      onSuccess();
    } catch (error) {
      console.error("Error regenerating illustration:", error);
      toast.error(
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't regenerate the illustration. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.description.trim();

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === "create" && !formData.name && !formData.description && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Need inspiration? Tap one to start.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_WIZARDS.map((example) => (
              <Button
                key={example.name}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setFormData({ ...example })}
              >
                <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {example.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Ember Thornwick"
          maxLength={60}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="description">Who are they?</Label>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {formData.description.length}/1000
          </span>
        </div>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Their look, their magic and their personality. The more vivid, the better the portrait and the duels."
          rows={5}
          maxLength={1000}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <RuneSpinner size="xs" label="Working…" className="mr-2" />
              {mode === "create"
                ? "Creating..."
                : redrawOnly
                  ? "Regenerating..."
                  : "Saving..."}
            </>
          ) : (
            <>
              {mode === "create" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : redrawOnly ? (
                <Wand2 className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {mode === "create"
                ? "Create wizard"
                : redrawOnly
                  ? hasPortrait
                    ? "Regenerate Portrait"
                    : "Generate Portrait"
                  : hasPortrait
                    ? "Save & Regenerate"
                    : "Save"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
      {mode === "create" && (
        <p className="-mt-3 text-sm text-muted-foreground">
          Free. The AI generates their portrait from your description. Keep it
          PG-13, and no real people or famous characters.
        </p>
      )}
      {mode === "edit" && hasPortrait && (
        <p className="-mt-3 text-sm text-muted-foreground">
          {redrawOnly
            ? "Generates a new portrait of your wizard. Costs 1 token."
            : "Saving generates a new portrait to match your changes. Costs 1 token."}
        </p>
      )}
      <WatcherDialog
        rejection={watcherRejection}
        onClose={() => setWatcherRejection(null)}
        retryLabel="Rework my wizard"
      />
    </form>
  );

  if (inModal) {
    return formContent;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      {mode === "create" ? null : (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Wizard</CardTitle>
              <CardDescription>
                Update your wizard&apos;s details or generate a new portrait.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className={mode === "create" ? "pt-6" : undefined}>
        {formContent}
      </CardContent>
    </Card>
  );
}
