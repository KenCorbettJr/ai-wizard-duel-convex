"use client";

import Image from "next/image";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useConvexImage } from "@/hooks/useConvexImage";
import {
  Settings,
  Database,
  AlertTriangle,
  RefreshCw,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";

// Component to handle opponent image display with proper URL conversion
function OpponentImage({
  opponent,
  onRegenerateImage,
}: {
  opponent: Doc<"wizards">;
  onRegenerateImage: () => void;
}) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const imageUrl = useConvexImage(
    api.wizards.getIllustrationUrl,
    opponent.illustration
      ? { storageId: opponent.illustration }
      : ("skip" as unknown as { storageId: Id<"_storage"> }),
  );

  if (opponent.illustration && imageUrl) {
    return (
      <>
        <div className="flex-shrink-0">
          <button
            type="button"
            aria-label={`View or regenerate ${opponent.name}'s image`}
            className="relative group block cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => setIsImageModalOpen(true)}
          >
            <Image
              src={imageUrl}
              alt={opponent.name}
              width={80}
              height={80}
              className="h-16 w-16 rounded-lg border-2 border-primary/30 object-cover transition-colors hover:border-primary/50 sm:h-20 sm:w-20"
            />
            {/* Always visible, so touch users know the image opens */}
            <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-card/90 p-1 shadow-sm md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
              <ImageIcon
                className="h-3.5 w-3.5 text-foreground"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>

        {/* Image Modal */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 sm:justify-start">
                <ImageIcon className="h-5 w-5" />
                {opponent.name}
              </DialogTitle>
              <DialogDescription>
                Campaign opponent illustration
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">
              <Image
                src={imageUrl}
                alt={opponent.name}
                width={400}
                height={400}
                className="max-w-full h-auto rounded-lg border border-border"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={onRegenerateImage}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate Image
              </Button>
              <Button onClick={() => setIsImageModalOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex-shrink-0">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted sm:h-20 sm:w-20">
        <Button
          size="icon"
          variant="outline"
          onClick={onRegenerateImage}
          aria-label={`Generate ${opponent.name}'s image`}
          title="Generate image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Removable trait chips with real, touch-sized remove buttons. */
function TraitChips({
  traits,
  onRemove,
}: {
  traits: string[];
  onRemove: (index: number) => void;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {traits.map((trait, index) => (
        <li
          key={index}
          className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-3 pr-0.5 text-sm text-secondary-foreground"
        >
          {trait}
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${trait}`}
            className="-my-1.5 -mr-1 inline-flex size-11 items-center justify-center rounded-full hover:bg-background/60 active:bg-background/60"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

interface OpponentFormData {
  name: string;
  description: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  luckModifier: number;
  spellStyle: string;
  personalityTraits: string[];
  illustrationPrompt: string;
}

const defaultFormData: OpponentFormData = {
  name: "",
  description: "",
  difficulty: "BEGINNER",
  luckModifier: 0,
  spellStyle: "",
  personalityTraits: [],
  illustrationPrompt: "",
};

export default function CampaignOpponentsPage() {
  const [editingOpponent, setEditingOpponent] = useState<Id<"wizards"> | null>(
    null,
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<OpponentFormData>(defaultFormData);
  const [personalityTraitInput, setPersonalityTraitInput] = useState("");

  // Queries
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);

  // Mutations
  const seedOpponents = useMutation(api.campaigns.seedCampaignOpponentsPublic);
  const deleteOpponents = useMutation(api.campaigns.deleteCampaignOpponents);
  const updateOpponent = useMutation(api.campaigns.updateCampaignOpponent);
  const createOpponent = useMutation(api.campaigns.createCampaignOpponent);
  const regenerateImage = useMutation(
    api.campaigns.regenerateCampaignOpponentImage,
  );
  const generateAllIllustrations = useMutation(
    api.campaigns.generateCampaignOpponentIllustrations,
  );

  // Handle seeding opponents
  const handleSeedOpponents = async () => {
    try {
      const result = await seedOpponents({});
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to seed opponents: " + (error as Error).message);
    }
  };

  // Handle deleting all opponents
  const handleDeleteAllOpponents = async () => {
    try {
      const result = await deleteOpponents({});
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to delete opponents: " + (error as Error).message);
    }
  };

  // Handle editing an opponent
  const handleEditOpponent = (opponent: Doc<"wizards">) => {
    setEditingOpponent(opponent._id);
    setFormData({
      name: opponent.name,
      description: opponent.description,
      difficulty: opponent.difficulty || "BEGINNER",
      luckModifier: opponent.luckModifier || 0,
      spellStyle: opponent.spellStyle || "",
      personalityTraits: opponent.personalityTraits || [],
      illustrationPrompt: opponent.illustrationPrompt || "",
    });
  };

  // Handle saving opponent changes
  const handleSaveOpponent = async () => {
    if (!editingOpponent) return;

    try {
      const result = await updateOpponent({
        opponentId: editingOpponent,
        updates: formData,
      });

      if (result.success) {
        toast.success(result.message);
        setEditingOpponent(null);
        setFormData(defaultFormData);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to update opponent: " + (error as Error).message);
    }
  };

  // Handle regenerating opponent image
  const handleRegenerateImage = async (opponentId: Id<"wizards">) => {
    try {
      const result = await regenerateImage({
        opponentId,
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to regenerate image: " + (error as Error).message);
    }
  };

  // Handle generating all illustrations
  const handleGenerateAllIllustrations = async () => {
    try {
      const result = await generateAllIllustrations({});
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(
        "Failed to generate illustrations: " + (error as Error).message,
      );
    }
  };

  // Handle creating new opponent
  const handleCreateOpponent = async () => {
    // Find next available opponent number
    const existingNumbers =
      campaignOpponents?.map((o) => o.opponentNumber || 0) || [];
    let nextNumber = 1;
    while (existingNumbers.includes(nextNumber) && nextNumber <= 10) {
      nextNumber++;
    }

    if (nextNumber > 10) {
      toast.error("Cannot create more than 10 campaign opponents");
      return;
    }

    try {
      const result = await createOpponent({
        opponentNumber: nextNumber,
        ...formData,
      });

      if (result.success) {
        toast.success(result.message);
        setIsCreateDialogOpen(false);
        setFormData(defaultFormData);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to create opponent: " + (error as Error).message);
    }
  };

  // Handle adding personality trait
  const handleAddPersonalityTrait = () => {
    if (personalityTraitInput.trim()) {
      setFormData({
        ...formData,
        personalityTraits: [
          ...formData.personalityTraits,
          personalityTraitInput.trim(),
        ],
      });
      setPersonalityTraitInput("");
    }
  };

  // Handle removing personality trait
  const handleRemovePersonalityTrait = (index: number) => {
    setFormData({
      ...formData,
      personalityTraits: formData.personalityTraits.filter(
        (_, i) => i !== index,
      ),
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-success/15 text-success";
      case "INTERMEDIATE":
        return "bg-warning/15 text-warning";
      case "ADVANCED":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <PageHeader
                className="mb-0"
                compactOnMobile
                title="Campaign Opponents"
                description="Create, edit, and manage the 10 campaign opponents that players will face"
                icon={<Settings className="h-6 w-6" aria-hidden="true" />}
              />
            </div>

            {/* Action buttons: a 2x2 grid on phones */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 [&_button]:w-full [&_button]:px-2 sm:[&_button]:w-auto sm:[&_button]:px-4 max-[399px]:[&_button_svg]:hidden">
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New opponent
                  </Button>
                </DialogTrigger>
              </Dialog>

              <Button
                onClick={handleSeedOpponents}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Seed defaults
              </Button>

              {campaignOpponents && campaignOpponents.length > 0 && (
                <>
                  <Button
                    onClick={handleGenerateAllIllustrations}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Generate images
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="flex w-full items-center gap-2 sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Banish every campaign opponent?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This deletes ALL campaign opponents and cannot be
                          undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep them</AlertDialogCancel>
                        <AlertDialogAction
                          className={buttonVariants({ variant: "destructive" })}
                          onClick={handleDeleteAllOpponents}
                        >
                          Delete all
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          {campaignOpponents === undefined ? (
            <Card>
              <CardContent className="text-center py-12">
                <RuneSpinner label="Loading campaign opponents…" />
              </CardContent>
            </Card>
          ) : campaignOpponents.length === 0 ? (
            <Card>
              <CardContent className="px-4 py-10 text-center sm:py-12">
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
                <h3 className="text-xl font-semibold mb-2">
                  No Campaign Opponents
                </h3>
                <p className="text-muted-foreground mb-6">
                  No campaign opponents have been created yet. Use the
                  &quot;Seed Default Opponents&quot; or &quot;Create
                  Opponent&quot; button to get started.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    onClick={handleSeedOpponents}
                    className="flex items-center gap-2"
                  >
                    <Database className="h-4 w-4" />
                    Seed Default Opponents
                  </Button>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Custom Opponent
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {campaignOpponents
                .sort(
                  (a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0),
                )
                .map((opponent) => (
                  <Card key={opponent._id} className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          {/* Opponent Image */}
                          <OpponentImage
                            opponent={opponent}
                            onRegenerateImage={() =>
                              handleRegenerateImage(opponent._id)
                            }
                          />

                          {/* Opponent Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-primary sm:text-2xl">
                                #{opponent.opponentNumber}
                              </span>
                              <CardTitle className="min-w-0 break-words text-lg sm:text-xl">
                                {opponent.name}
                              </CardTitle>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                className={getDifficultyColor(
                                  opponent.difficulty || "BEGINNER",
                                )}
                              >
                                {opponent.difficulty}
                              </Badge>
                              <Badge variant="outline">
                                Luck:{" "}
                                {`${(opponent.luckModifier || 0) > 0 ? "+" : ""}${
                                  opponent.luckModifier || 0
                                }`}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 sm:shrink-0">
                          {editingOpponent === opponent._id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveOpponent}
                                className="flex flex-1 items-center gap-1 sm:flex-none"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingOpponent(null);
                                  setFormData(defaultFormData);
                                }}
                                className="flex flex-1 items-center gap-1 sm:flex-none"
                              >
                                <X className="h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOpponent(opponent)}
                              className="flex flex-1 items-center gap-1 sm:flex-none"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Edit mode: name, difficulty and luck as a normal form */}
                      {editingOpponent === opponent._id && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                          <div className="space-y-1">
                            <Label htmlFor={`name-${opponent._id}`}>Name</Label>
                            <Input
                              id={`name-${opponent._id}`}
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`difficulty-${opponent._id}`}>
                              Difficulty
                            </Label>
                            <Select
                              value={formData.difficulty}
                              onValueChange={(
                                value: "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                              ) =>
                                setFormData({
                                  ...formData,
                                  difficulty: value,
                                })
                              }
                            >
                              <SelectTrigger
                                id={`difficulty-${opponent._id}`}
                                className="w-full"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BEGINNER">
                                  BEGINNER
                                </SelectItem>
                                <SelectItem value="INTERMEDIATE">
                                  INTERMEDIATE
                                </SelectItem>
                                <SelectItem value="ADVANCED">
                                  ADVANCED
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`luck-${opponent._id}`}>
                              Luck (-5 to 5)
                            </Label>
                            <Input
                              id={`luck-${opponent._id}`}
                              type="number"
                              inputMode="numeric"
                              value={formData.luckModifier}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  luckModifier: parseInt(e.target.value) || 0,
                                })
                              }
                              min={-5}
                              max={5}
                            />
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label
                          htmlFor={`description-${opponent._id}`}
                          className="text-sm font-medium"
                        >
                          Description
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Textarea
                            id={`description-${opponent._id}`}
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                description: e.target.value,
                              })
                            }
                            className="mt-1"
                            rows={3}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {opponent.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor={`spellStyle-${opponent._id}`}
                          className="text-sm font-medium"
                        >
                          Spell Style
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Input
                            id={`spellStyle-${opponent._id}`}
                            value={formData.spellStyle}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                spellStyle: e.target.value,
                              })
                            }
                            className="mt-1"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {opponent.spellStyle}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor={`traits-${opponent._id}`}
                          className="text-sm font-medium"
                        >
                          Personality Traits
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                id={`traits-${opponent._id}`}
                                value={personalityTraitInput}
                                onChange={(e) =>
                                  setPersonalityTraitInput(e.target.value)
                                }
                                placeholder="Add personality trait..."
                                enterKeyHint="enter"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddPersonalityTrait();
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={handleAddPersonalityTrait}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <TraitChips
                                traits={formData.personalityTraits}
                                onRemove={handleRemovePersonalityTrait}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {opponent.personalityTraits?.map((trait, index) => (
                              <Badge key={index} variant="secondary">
                                {trait}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label
                          htmlFor={`illustrationPrompt-${opponent._id}`}
                          className="text-sm font-medium"
                        >
                          Illustration Prompt
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Textarea
                            id={`illustrationPrompt-${opponent._id}`}
                            value={formData.illustrationPrompt}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                illustrationPrompt: e.target.value,
                              })
                            }
                            className="mt-1"
                            rows={2}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground mt-1">
                            {opponent.illustrationPrompt}
                          </p>
                        )}
                      </div>

                      {/* Save again at the bottom, next to the last field edited */}
                      {editingOpponent === opponent._id && (
                        <div className="flex gap-2 border-t border-border pt-4 [&>button]:flex-1 sm:justify-end sm:[&>button]:flex-none">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingOpponent(null);
                              setFormData(defaultFormData);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSaveOpponent}>
                            <Save className="h-4 w-4" />
                            Save changes
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Create Opponent Dialog */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Campaign Opponent</DialogTitle>
                <DialogDescription>
                  Create a custom campaign opponent with unique characteristics.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 [&_label]:mb-1.5">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter opponent name..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the opponent's background and personality..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(
                        value: "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
                      ) =>
                        setFormData({
                          ...formData,
                          difficulty: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BEGINNER">BEGINNER</SelectItem>
                        <SelectItem value="INTERMEDIATE">
                          INTERMEDIATE
                        </SelectItem>
                        <SelectItem value="ADVANCED">ADVANCED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="luckModifier">Luck Modifier</Label>
                    <Input
                      id="luckModifier"
                      type="number"
                      inputMode="numeric"
                      value={formData.luckModifier}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          luckModifier: parseInt(e.target.value) || 0,
                        })
                      }
                      min={-5}
                      max={5}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="spellStyle">Spell Style</Label>
                  <Input
                    id="spellStyle"
                    value={formData.spellStyle}
                    onChange={(e) =>
                      setFormData({ ...formData, spellStyle: e.target.value })
                    }
                    placeholder="e.g., fire magic, illusion spells..."
                  />
                </div>

                <div>
                  <Label htmlFor="create-traits">Personality Traits</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="create-traits"
                        value={personalityTraitInput}
                        onChange={(e) =>
                          setPersonalityTraitInput(e.target.value)
                        }
                        placeholder="Add personality trait..."
                        enterKeyHint="enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPersonalityTrait();
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleAddPersonalityTrait}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <TraitChips
                        traits={formData.personalityTraits}
                        onRemove={handleRemovePersonalityTrait}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="illustrationPrompt">
                    Illustration Prompt
                  </Label>
                  <Textarea
                    id="illustrationPrompt"
                    value={formData.illustrationPrompt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        illustrationPrompt: e.target.value,
                      })
                    }
                    placeholder="Describe how this opponent should look in illustrations..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData(defaultFormData);
                    setPersonalityTraitInput("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateOpponent}>Create Opponent</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SuperAdminOnly>
      </div>
    </div>
  );
}
