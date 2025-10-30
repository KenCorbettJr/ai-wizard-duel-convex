"use client";

import Image from "next/image";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useState } from "react";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";

// Component to handle opponent image display with proper URL conversion
function OpponentImage({
  opponent,
  onRegenerateImage,
}: {
  opponent: Doc<"wizards">;
  onRegenerateImage: () => void;
}) {
  const imageUrl = useQuery(
    api.wizards.getIllustrationUrl,
    opponent.illustration ? { storageId: opponent.illustration } : "skip"
  );

  if (opponent.illustration && imageUrl) {
    return (
      <div className="flex-shrink-0">
        <div className="relative group">
          <Image
            src={imageUrl}
            alt={opponent.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover border-2 border-purple-200 dark:border-purple-700"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
            <Button
              size="sm"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={onRegenerateImage}
            >
              <ImageIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0">
      <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Button
          size="sm"
          variant="outline"
          onClick={onRegenerateImage}
          className="flex items-center gap-1"
        >
          <ImageIcon className="h-3 w-3" />
          Generate
        </Button>
      </div>
    </div>
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
    null
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
    api.campaigns.regenerateCampaignOpponentImage
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
    if (
      !confirm(
        "Are you sure you want to delete ALL campaign opponents? This action cannot be undone."
      )
    ) {
      return;
    }

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
        (_, i) => i !== index
      ),
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "BEGINNER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "INTERMEDIATE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ADVANCED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="container mx-auto px-6 py-12">
        <SuperAdminOnly>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                Campaign Opponents Management
              </h2>
              <p className="text-muted-foreground">
                Create, edit, and manage the 10 campaign opponents that players
                will face
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Opponent
                  </Button>
                </DialogTrigger>
              </Dialog>

              <Button
                onClick={handleSeedOpponents}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Seed Default Opponents
              </Button>

              {campaignOpponents && campaignOpponents.length > 0 && (
                <Button
                  onClick={handleDeleteAllOpponents}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          {campaignOpponents === undefined ? (
            <Card>
              <CardContent className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-4 animate-spin" />
                <p className="text-muted-foreground">
                  Loading campaign opponents...
                </p>
              </CardContent>
            </Card>
          ) : campaignOpponents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No Campaign Opponents
                </h3>
                <p className="text-muted-foreground mb-6">
                  No campaign opponents have been created yet. Use the
                  &quot;Seed Default Opponents&quot; or &quot;Create
                  Opponent&quot; button to get started.
                </p>
                <div className="flex gap-3 justify-center">
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
            <div className="grid gap-6">
              {campaignOpponents
                .sort(
                  (a, b) => (a.opponentNumber || 0) - (b.opponentNumber || 0)
                )
                .map((opponent) => (
                  <Card key={opponent._id} className="relative">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* Opponent Image */}
                          <OpponentImage
                            opponent={opponent}
                            onRegenerateImage={() =>
                              handleRegenerateImage(opponent._id)
                            }
                          />

                          {/* Opponent Info */}
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              #{opponent.opponentNumber}
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                {editingOpponent === opponent._id ? (
                                  <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        name: e.target.value,
                                      })
                                    }
                                    className="text-xl font-semibold"
                                  />
                                ) : (
                                  opponent.name
                                )}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  className={getDifficultyColor(
                                    opponent.difficulty || "BEGINNER"
                                  )}
                                >
                                  {editingOpponent === opponent._id ? (
                                    <Select
                                      value={formData.difficulty}
                                      onValueChange={(
                                        value:
                                          | "BEGINNER"
                                          | "INTERMEDIATE"
                                          | "ADVANCED"
                                      ) =>
                                        setFormData({
                                          ...formData,
                                          difficulty: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger className="w-32 h-6 text-xs">
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
                                  ) : (
                                    opponent.difficulty
                                  )}
                                </Badge>
                                <Badge variant="outline">
                                  Luck:{" "}
                                  {editingOpponent === opponent._id ? (
                                    <Input
                                      type="number"
                                      value={formData.luckModifier}
                                      onChange={(e) =>
                                        setFormData({
                                          ...formData,
                                          luckModifier:
                                            parseInt(e.target.value) || 0,
                                        })
                                      }
                                      className="w-16 h-6 ml-1"
                                      min={-5}
                                      max={5}
                                    />
                                  ) : (
                                    `${(opponent.luckModifier || 0) > 0 ? "+" : ""}${
                                      opponent.luckModifier || 0
                                    }`
                                  )}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingOpponent === opponent._id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={handleSaveOpponent}
                                className="flex items-center gap-1"
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
                                className="flex items-center gap-1"
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
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">
                          Description
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Textarea
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
                        <Label className="text-sm font-medium">
                          Spell Style
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Input
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
                        <Label className="text-sm font-medium">
                          Personality Traits
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <div className="mt-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                value={personalityTraitInput}
                                onChange={(e) =>
                                  setPersonalityTraitInput(e.target.value)
                                }
                                placeholder="Add personality trait..."
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
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
                              {formData.personalityTraits.map(
                                (trait, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="cursor-pointer"
                                    onClick={() =>
                                      handleRemovePersonalityTrait(index)
                                    }
                                  >
                                    {trait} ×
                                  </Badge>
                                )
                              )}
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
                        <Label className="text-sm font-medium">
                          Illustration Prompt
                        </Label>
                        {editingOpponent === opponent._id ? (
                          <Textarea
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
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Campaign Opponent</DialogTitle>
                <DialogDescription>
                  Create a custom campaign opponent with unique characteristics.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(
                        value: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
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
                  <Label>Personality Traits</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={personalityTraitInput}
                        onChange={(e) =>
                          setPersonalityTraitInput(e.target.value)
                        }
                        placeholder="Add personality trait..."
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleAddPersonalityTrait();
                          }
                        }}
                      />
                      <Button size="sm" onClick={handleAddPersonalityTrait}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.personalityTraits.map((trait, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => handleRemovePersonalityTrait(index)}
                        >
                          {trait} ×
                        </Badge>
                      ))}
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
