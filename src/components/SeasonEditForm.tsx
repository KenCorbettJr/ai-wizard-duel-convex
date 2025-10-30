"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, Info } from "lucide-react";

interface Season {
  _id: Id<"campaignSeasons">;
  name: string;
  description: string;
  startDate: number;
  endDate: number;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  completionRelic: {
    name: string;
    description: string;
    luckBonus: number;
    iconUrl?: string;
  };
  opponentSet: string;
  maxParticipants?: number;
  isDefault?: boolean;
  participantCount: number;
}

interface SeasonEditFormProps {
  season: Season;
  onClose: () => void;
  onSuccess: () => void;
}

export function SeasonEditForm({
  season,
  onClose,
  onSuccess,
}: SeasonEditFormProps) {
  const opponentSets = useQuery(api.seasonalOpponents.getAvailableOpponentSets);
  const updateSeason = useMutation(api.campaignSeasons.updateCampaignSeason);

  const [formData, setFormData] = useState({
    name: season.name,
    description: season.description,
    startDate: new Date(season.startDate).toISOString().slice(0, 16),
    endDate: new Date(season.endDate).toISOString().slice(0, 16),
    status: season.status,
    relicName: season.completionRelic.name,
    relicDescription: season.completionRelic.description,
    luckBonus: season.completionRelic.luckBonus,
    opponentSet: season.opponentSet,
    maxParticipants: season.maxParticipants?.toString() || "",
    isDefault: season.isDefault || false,
  });

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    name?: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    status?: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    completionRelic?: {
      name: string;
      description: string;
      luckBonus: number;
      iconUrl?: string;
    };
    maxParticipants?: number;
    isDefault?: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if there are participants
  const hasParticipants = season.participantCount > 0;

  // Check if this is a critical change that affects participants
  const hasCriticalChanges = () => {
    return (
      formData.opponentSet !== season.opponentSet ||
      formData.status !== season.status ||
      formData.luckBonus !== season.completionRelic.luckBonus
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates
    const startDate = new Date(formData.startDate).getTime();
    const endDate = new Date(formData.endDate).getTime();

    if (startDate >= endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    // Validate luck bonus
    if (formData.luckBonus < 1 || formData.luckBonus > 5) {
      toast.error("Luck bonus must be between 1 and 5");
      return;
    }

    // Prepare updates object
    const updates = {
      name: formData.name !== season.name ? formData.name : undefined,
      description:
        formData.description !== season.description
          ? formData.description
          : undefined,
      startDate: startDate !== season.startDate ? startDate : undefined,
      endDate: endDate !== season.endDate ? endDate : undefined,
      status: formData.status !== season.status ? formData.status : undefined,
      completionRelic:
        formData.relicName !== season.completionRelic.name ||
        formData.relicDescription !== season.completionRelic.description ||
        formData.luckBonus !== season.completionRelic.luckBonus
          ? {
              name: formData.relicName,
              description: formData.relicDescription,
              luckBonus: formData.luckBonus,
              iconUrl: season.completionRelic.iconUrl,
            }
          : undefined,
      maxParticipants: formData.maxParticipants
        ? parseInt(formData.maxParticipants)
        : formData.maxParticipants === ""
          ? undefined
          : season.maxParticipants,
      isDefault:
        formData.isDefault !== (season.isDefault || false)
          ? formData.isDefault
          : undefined,
    };

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    // If no changes, just close
    if (Object.keys(cleanUpdates).length === 0) {
      toast.info("No changes to save");
      onClose();
      return;
    }

    // If there are participants and critical changes, show confirmation
    if (hasParticipants && hasCriticalChanges()) {
      setPendingChanges(cleanUpdates);
      setShowConfirmDialog(true);
      return;
    }

    // Otherwise, submit directly
    await submitChanges(cleanUpdates);
  };

  const submitChanges = async (updates: {
    name?: string;
    description?: string;
    startDate?: number;
    endDate?: number;
    status?: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    completionRelic?: {
      name: string;
      description: string;
      luckBonus: number;
      iconUrl?: string;
    };
    maxParticipants?: number;
    isDefault?: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      await updateSeason({
        seasonId: season._id,
        updates,
      });

      toast.success("Season updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Failed to update season: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setPendingChanges(null);
    }
  };

  const handleConfirmChanges = () => {
    if (pendingChanges) {
      submitChanges(pendingChanges);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Edit Season: {season.name}</CardTitle>
          <CardDescription>
            Modify season details. Changes to active seasons may affect ongoing
            campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasParticipants && (
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This season has {season.participantCount} participants. Some
                changes may affect ongoing campaigns.
              </AlertDescription>
            </Alert>
          )}

          {season.status === "ARCHIVED" && (
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Archived seasons cannot be edited. Please contact a developer if
                changes are needed.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Season Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Season of Fire"
                  required
                  disabled={season.status === "ARCHIVED"}
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(
                    value: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ARCHIVED"
                  ) => setFormData({ ...formData, status: value })}
                  disabled={season.status === "ARCHIVED"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this season's theme and challenges..."
                required
                disabled={season.status === "ARCHIVED"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                  disabled={season.status === "ARCHIVED"}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                  disabled={season.status === "ARCHIVED"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="opponentSet">Opponent Set</Label>
                <Select
                  value={formData.opponentSet}
                  onValueChange={(value) =>
                    setFormData({ ...formData, opponentSet: value })
                  }
                  disabled={season.status === "ARCHIVED"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opponentSets?.map((set: { key: string; name: string }) => (
                      <SelectItem key={set.key} value={set.key}>
                        {set.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasParticipants &&
                  formData.opponentSet !== season.opponentSet && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Changing opponent set may affect ongoing campaigns
                    </p>
                  )}
              </div>
              <div>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: e.target.value,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                  disabled={season.status === "ARCHIVED"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="relicName">Completion Relic Name</Label>
                <Input
                  id="relicName"
                  value={formData.relicName}
                  onChange={(e) =>
                    setFormData({ ...formData, relicName: e.target.value })
                  }
                  placeholder="e.g., Phoenix Feather"
                  required
                  disabled={season.status === "ARCHIVED"}
                />
              </div>
              <div>
                <Label htmlFor="luckBonus">Luck Bonus</Label>
                <Input
                  id="luckBonus"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.luckBonus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      luckBonus: parseInt(e.target.value),
                    })
                  }
                  required
                  disabled={season.status === "ARCHIVED"}
                />
                {hasParticipants &&
                  formData.luckBonus !== season.completionRelic.luckBonus && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Changing luck bonus may affect existing player relics
                    </p>
                  )}
              </div>
            </div>

            <div>
              <Label htmlFor="relicDescription">Relic Description</Label>
              <Textarea
                id="relicDescription"
                value={formData.relicDescription}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relicDescription: e.target.value,
                  })
                }
                placeholder="Describe the relic's power and significance..."
                required
                disabled={season.status === "ARCHIVED"}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isDefault: checked as boolean })
                }
                disabled={season.status === "ARCHIVED"}
              />
              <Label htmlFor="isDefault">Set as default season</Label>
              {formData.isDefault && !season.isDefault && (
                <p className="text-sm text-blue-600">
                  This will remove default status from other seasons
                </p>
              )}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || season.status === "ARCHIVED"}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
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
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Critical Changes</AlertDialogTitle>
            <AlertDialogDescription>
              This season has {season.participantCount} active participants. The
              changes you&apos;re making may affect their ongoing campaigns:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {formData.opponentSet !== season.opponentSet && (
                  <li>Changing opponent set may disrupt campaign progress</li>
                )}
                {formData.status !== season.status && (
                  <li>Changing status may affect season availability</li>
                )}
                {formData.luckBonus !== season.completionRelic.luckBonus && (
                  <li>
                    Changing luck bonus will update existing player relics
                  </li>
                )}
              </ul>
              <p className="mt-2">Are you sure you want to proceed?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmChanges}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Confirm Changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
