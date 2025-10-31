"use client";

import { useState } from "react";
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
import { Edit, Archive } from "lucide-react";

export default function AdminSeasonsPage() {
  const seasons = useQuery(api.campaignSeasons.getAllCampaignSeasons);
  const campaignOpponents = useQuery(api.campaigns.getCampaignOpponents);
  const createSeason = useMutation(api.campaignSeasons.createCampaignSeason);
  const archiveSeason = useMutation(api.campaignSeasons.archiveCampaignSeason);
  const createDefaultSeason = useMutation(
    api.campaignSeasons.createDefaultSeason
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
        "Failed to create default season: " + (error as Error).message
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
        return "bg-green-500";
      case "ARCHIVED":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getOpponentName = (opponentId: Id<"wizards">) => {
    const opponent = campaignOpponents?.find((o) => o._id === opponentId);
    return opponent ? opponent.name : "Unknown Opponent";
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Campaign Seasons Management</h1>
        <div className="space-x-2">
          <Button onClick={() => setShowCreateForm(true)}>
            Create New Season
          </Button>
          <Button variant="outline" onClick={handleCreateDefaultSeason}>
            Create Default Season
          </Button>
        </div>
      </div>

      {editingSeason && (
        <div className="mb-6">
          <SeasonEditForm
            season={editingSeason}
            onClose={handleCloseEdit}
            onSuccess={handleEditSuccess}
          />
        </div>
      )}

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Season</CardTitle>
            <CardDescription>
              Create a new time-limited campaign season with custom opponents
              and rewards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSeason} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                  />
                </div>
                <div>
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
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "ACTIVE" | "ARCHIVED") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
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
                />
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
                  />
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
                />
              </div>

              <div>
                <Label htmlFor="maxParticipants">
                  Max Participants (optional)
                </Label>
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
                />
              </div>

              <div className="flex space-x-2">
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

      <div className="grid gap-4">
        {seasons?.map((season: SeasonWithParticipantCount) => (
          <Card key={season._id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
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
                <div className="text-right text-sm text-muted-foreground">
                  {season.participantCount} participants
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                <strong>Completion Relic:</strong> {season.completionRelic.name}{" "}
                (+
                {season.completionRelic.luckBonus} luck)
                <p className="text-sm text-muted-foreground mt-1">
                  {season.completionRelic.description}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Created {formatDistanceToNow(season.createdAt)} ago
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditSeason(season)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {season.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleArchiveSeason(season._id)}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
