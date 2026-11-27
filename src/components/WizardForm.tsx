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
import { Save, X, Plus } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import posthog from "posthog-js";
import {
  WatcherDialog,
  type WatcherRejection,
} from "@/components/watcher/WatcherDialog";

interface WizardFormData {
  name: string;
  description: string;
  isAIPowered?: boolean;
}

interface WizardFormProps {
  mode: "create" | "edit";
  initialData?: WizardFormData;
  wizardId?: Id<"wizards">;
  onClose: () => void;
  /** Called after a save. Creates pass the new wizard's id. */
  onSuccess: (wizardId?: Id<"wizards">) => void;
  inModal?: boolean;
}

export function WizardForm({
  mode,
  initialData,
  wizardId,
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
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !formData.name.trim() || !formData.description.trim())
      return;

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

    setIsRegenerating(true);
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
      setIsRegenerating(false);
    }
  };

  const isFormValid = formData.name.trim() && formData.description.trim();

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Wizard Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter wizard name"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Describe your wizard's abilities, appearance, and personality"
          rows={4}
          required
          disabled={isSubmitting}
        />
      </div>

      {mode === "edit" && (
        <div className="p-4 bg-info/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-info">Portrait</h4>
              <p className="text-sm text-info">
                Saving a new name or description repaints the portrait to
                match (1 token). Want a fresh take without changing anything?
                Redraw it here.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerateIllustration}
              disabled={isRegenerating || isSubmitting}
            >
              {isRegenerating ? (
                <>
                  <RuneSpinner size="xs" label="Working…" className="mr-2" />
                  Generating...
                </>
              ) : (
                "Redraw (1 token)"
              )}
            </Button>
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <RuneSpinner size="xs" label="Working…" className="mr-2" />
              {mode === "create" ? "Creating..." : "Saving..."}
            </>
          ) : (
            <>
              {mode === "create" ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {mode === "create" ? "Create Wizard" : "Save Changes"}
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {mode === "create" ? "Create New Wizard" : "Edit Wizard"}
            </CardTitle>
            <CardDescription>
              {mode === "create"
                ? "Design your magical companion"
                : "Update your wizard's details. Changes repaint the portrait (1 token)."}
            </CardDescription>
          </div>
          {mode === "edit" && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
