"use client";

import { useState } from "react";
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
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type SeasonWithParticipantCount = {
  _id: Id<"campaignSeasons">;
  _creationTime: number;
  name: string;
  description: string;
  status: "ACTIVE" | "ARCHIVED";
  completionRelic: {
    name: string;
    description: string;
    luckBonus: number;
    iconUrl?: string;
  };
  opponents: Id<"wizards">[];
  maxParticipants?: number;
  isDefault?: boolean;
  createdAt: number;
  createdBy: string;
  participantCount: number;
};
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { SeasonEditForm } from "@/components/SeasonEditForm";
import { DragDropOpponentSelector } from "@/components/DragDropOpponentSelector";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Edit, Archive, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { RuneSpinner } from "@/components/ui/rune-spinner";

/** Scrolls a just-opened form into view, below the phone's sticky bars. */
const scrollIntoViewOnMount = (el: HTMLElement | null) => {
  if (!el) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};

export default function AdminSeasonsPage() {
  const seasons = useQuery(api.campaignSeasons.getAllCampaignSeasons);
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);
  const createSeason = useMutation(api.campaignSeasons.createCampaignSeason);
  const archiveSeason = useMutation(api.campaignSeasons.archiveCampaignSeason);
  const createDefaultSeason = useMutation(
    api.campaignSeasons.createDefaultSeason,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSeason, setEditingSeason] =
    useState<SeasonWithParticipantCount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    relicName: "",
    relicDescription: "",
    luckBonus: 1,
    opponents: [] as Id<"wizards">[],
    maxParticipants: "",
    status: "ACTIVE" as "ACTIVE" | "ARCHIVED",
  });

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSeason({
        name: formData.name,
        description: formData.description,
        completionRelic: {
          name: formData.relicName,
          description: formData.relicDescription,
          luckBonus: formData.luckBonus,
        },
        opponents: formData.opponents,
        maxParticipants: formData.maxParticipants
          ? parseInt(formData.maxParticipants)
          : undefined,
        status: formData.status,
      });

      toast.success("Season created successfully!");
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        relicName: "",
        relicDescription: "",
        luckBonus: 1,
        opponents: [],
        maxParticipants: "",
        status: "ACTIVE",
      });
    } catch (error) {
      toast.error("Failed to create season: " + (error as Error).message);
    }
  };

  const handleArchiveSeason = async (seasonId: string) => {
    try {
      await archiveSeason({ seasonId: seasonId as Id<"campaignSeasons"> });
      toast.success("Season archived successfully!");
    } catch (error) {
      toast.error("Failed to archive season: " + (error as Error).message);
    }
  };

  const handleCreateDefaultSeason = async () => {
    try {
      await createDefaultSeason({});
      toast.success("Default season created successfully!");
    } catch (error) {
      toast.error(
        "Failed to create default season: " + (error as Error).message,
      );
    }
  };

  const handleEditSeason = (season: SeasonWithParticipantCount) => {
    setEditingSeason(season);
  };

  const handleCloseEdit = () => {
    setEditingSeason(null);
  };

  const handleEditSuccess = () => {
    // The seasons query will automatically refetch due to Convex reactivity
    toast.success("Season updated successfully!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success";
      case "ARCHIVED":
        return "bg-muted-foreground/60";
      default:
        return "bg-muted-foreground/60";
    }
  };

  const getOpponentName = (opponentId: Id<"wizards">) => {
    const opponent = campaignOpponents?.find((o) => o._id === opponentId);
    return opponent ? opponent.name : "Unknown Opponent";
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="Campaign Seasons"
        compactOnMobile
        className="mb-6 sm:mb-8"
        icon={<Calendar className="h-6 w-6" aria-hidden="true" />}
        actions={
          <>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => setShowCreateForm(true)}
            >
              New season
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              variant="outline"
              onClick={handleCreateDefaultSeason}
            >
              Default season
            </Button>
          </>
        }
      />

      {showCreateForm && (
        <Card
          ref={scrollIntoViewOnMount}
          className="mb-6 scroll-mt-[calc(var(--app-navbar-h)+4rem)] md:scroll-mt-6"
        >
          <CardHeader>
            <CardTitle>Create New Season</CardTitle>
            <CardDescription>
              Create a new time-limited campaign season with custom opponents
              and rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor="create-name">Season Name</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Season of Fire"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "ACTIVE" | "ARCHIVED") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="create-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 sm:p-4">
                <DragDropOpponentSelector
                  selectedOpponents={formData.opponents}
                  onOpponentsChange={(opponents) =>
                    setFormData({ ...formData, opponents })
                  }
                  availableOpponents={campaignOpponents || []}
                  maxOpponents={10}
                />
              </div>

              <div>
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this season's theme and challenges..."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="create-relicName">
                    Completion Relic Name
                  </Label>
                  <Input
                    id="create-relicName"
                    value={formData.relicName}
                    onChange={(e) =>
                      setFormData({ ...formData, relicName: e.target.value })
                    }
                    placeholder="e.g., Phoenix Feather"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="create-luckBonus">Luck Bonus</Label>
                  <Input
                    id="create-luckBonus"
                    type="number"
                    inputMode="numeric"
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
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="create-relicDescription">
                  Relic Description
                </Label>
                <Textarea
                  id="create-relicDescription"
                  value={formData.relicDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      relicDescription: e.target.value,
                    })
                  }
                  placeholder="Describe the relic's power and significance..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="create-maxParticipants">
                  Max Participants (optional)
                </Label>
                <Input
                  id="create-maxParticipants"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={formData.maxParticipants}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxParticipants: e.target.value,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="submit">Create Season</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {seasons === undefined && (
        <div className="flex justify-center py-12">
          <RuneSpinner size="md" label="Loading seasons…" />
        </div>
      )}

      <div className="grid gap-4">
        {seasons?.map((season: SeasonWithParticipantCount) =>
          editingSeason?._id === season._id ? (
            // Edit in place, so the form opens where the admin tapped Edit
            <div
              key={season._id}
              ref={scrollIntoViewOnMount}
              className="scroll-mt-[calc(var(--app-navbar-h)+4rem)] md:scroll-mt-6"
            >
              <SeasonEditForm
                season={editingSeason}
                onClose={handleCloseEdit}
                onSuccess={handleEditSuccess}
              />
            </div>
          ) : (
            <Card key={season._id}>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 break-words">
                      {season.name}
                      <Badge className={getStatusColor(season.status)}>
                        {season.status}
                      </Badge>
                      {season.isDefault && (
                        <Badge variant="outline">DEFAULT</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{season.description}</CardDescription>
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground sm:text-right">
                    {season.participantCount} participants
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2 sm:gap-4 sm:text-base">
                  <div>
                    <strong>Opponents:</strong>
                    <Badge variant="secondary" className="ml-2">
                      {season.opponents.length} selected
                    </Badge>
                  </div>
                  <div>
                    <strong>Max Participants:</strong>{" "}
                    {season.maxParticipants || "Unlimited"}
                  </div>
                </div>

                {season.opponents.length > 0 && (
                  <div className="mb-4">
                    <strong>Battle Order:</strong>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {season.opponents.slice(0, 5).map((opponentId, index) => (
                        <Badge
                          key={opponentId}
                          variant="outline"
                          className="text-xs"
                        >
                          {index + 1}. {getOpponentName(opponentId)}
                        </Badge>
                      ))}
                      {season.opponents.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{season.opponents.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <strong>Completion Relic:</strong>{" "}
                  {season.completionRelic.name} (+
                  {season.completionRelic.luckBonus} luck)
                  <p className="text-sm text-muted-foreground mt-1">
                    {season.completionRelic.description}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    Created {formatDistanceToNow(season.createdAt)} ago
                  </div>
                  <div className="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSeason(season)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {season.status === "ACTIVE" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Archive {season.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Archived seasons can no longer be edited.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep active</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleArchiveSeason(season._id)}
                            >
                              Archive season
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {seasons?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No seasons found. Create your first season to get started!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
