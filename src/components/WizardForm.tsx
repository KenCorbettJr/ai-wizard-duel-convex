"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
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
  onSuccess: () => void;
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
  const createWizard = useMutation(api.wizards.createWizard);
  const updateWizard = useMutation(api.wizards.updateWizard);
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
      if (mode === "create") {
        await createWizard({
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
      } else if (mode === "edit" && wizardId) {
        await updateWizard({
          wizardId,
          name: formData.name.trim(),
          description: formData.description.trim(),
        });
      }

      posthog.capture(mode === "create" ? "wizard_created" : "wizard_updated");
      onSuccess();
      if (mode === "create") {
        onClose();
      }
    } catch (error) {
      console.error(
        `Error ${mode === "create" ? "creating" : "updating"} wizard:`,
        error,
      );
      // You might want to show a toast notification here
      toast.error(
        `Error ${mode === "create" ? "creating" : "updating"} wizard. Please try again.`,
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
      posthog.capture("wizard_illustration_regenerated");
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
              <h4 className="font-medium text-info">Illustration Generation</h4>
              <p className="text-sm text-info">
                Saving changes to the name or description does not change the
                illustration. Regenerating it costs 1 token. Your first
                illustration is free.
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
                "Regenerate (1 token)"
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
                : "Update your wizard's details. Regenerating the illustration costs 1 token."}
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
