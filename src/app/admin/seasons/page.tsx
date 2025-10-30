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
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Edit, Archive } from "lucide-react";

export default function AdminSeasonsPage() {
  const seasons = useQuery(api.campaignSeasons.getAllCampaignSeasons);
  const opponentSets = useQuery(api.seasonalOpponents.getAvailableOpponentSets);
  const createSeason = useMutation(api.campaignSeasons.createCampaignSeason);
  const archiveSeason = useMutation(api.campaignSeasons.archiveCampaignSeason);
  const createDefaultSeason = useMutation(
    api.campaignSeasons.createDefaultSeason
  );
  // const runMigration = useMutation(api.migrations.runCampaignProgressMigration);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSeason, setEditingSeason] =
    useState<SeasonWithParticipantCount | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    relicName: "",
    relicDescription: "",
    luckBonus: 1,
    opponentSet: "classic",
    maxParticipants: "",
  });

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const startDate = new Date(formData.startDate).getTime();
      const endDate = new Date(formData.endDate).getTime();

      await createSeason({
        name: formData.name,
        description: formData.description,
        startDate,
        endDate,
        completionRelic: {
          name: formData.relicName,
          description: formData.relicDescription,
          luckBonus: formData.luckBonus,
        },
        opponentSet: formData.opponentSet,
        maxParticipants: formData.maxParticipants
          ? parseInt(formData.maxParticipants)
          : undefined,
      });

      toast.success("Season created successfully!");
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        relicName: "",
        relicDescription: "",
        luckBonus: 1,
        opponentSet: "classic",
        maxParticipants: "",
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

  const handleRunMigration = async () => {
    // try {
    //   const result = (await runMigration({})) as { message: string };
    //   toast.success(result.message);
    // } catch (error) {
    //   toast.error("Failed to run migration: " + (error as Error).message);
    // }
    toast.info("Migration functionality temporarily disabled");
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
      case "UPCOMING":
        return "bg-blue-500";
      case "COMPLETED":
        return "bg-gray-500";
      case "ARCHIVED":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
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
          <Button variant="outline" onClick={handleRunMigration}>
            Run Migration
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
                  />
                </div>
                <div>
                  <Label htmlFor="opponentSet">Opponent Set</Label>
                  <Select
                    value={formData.opponentSet}
                    onValueChange={(value) =>
                      setFormData({ ...formData, opponentSet: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opponentSets?.map(
                        (set: { key: string; name: string }) => (
                          <SelectItem key={set.key} value={set.key}>
                            {set.name}
                          </SelectItem>
                        )
                      )}
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
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    required
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
                  <strong>Start:</strong>{" "}
                  {new Date(season.startDate).toLocaleString()}
                </div>
                <div>
                  <strong>End:</strong>{" "}
                  {new Date(season.endDate).toLocaleString()}
                </div>
                <div>
                  <strong>Opponent Set:</strong> {season.opponentSet}
                </div>
                <div>
                  <strong>Max Participants:</strong>{" "}
                  {season.maxParticipants || "Unlimited"}
                </div>
              </div>

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
                  {season.status !== "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditSeason(season)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  {season.status === "COMPLETED" && (
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
