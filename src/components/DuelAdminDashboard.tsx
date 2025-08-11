"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DuelListItem } from "@/components/DuelListItem";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart3,
  Search,
  AlertTriangle,
  Clock,
  Swords,
  TrendingUp,
  Calendar,
  X,
} from "lucide-react";

interface DuelFilters {
  status?: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  playerUserId?: string;
  numberOfRounds?: number | "TO_THE_DEATH";
  createdAfter?: number;
  createdBefore?: number;
}

export function DuelAdminDashboard() {
  const [filters, setFilters] = useState<DuelFilters>({});

  const [selectedTimeRange, setSelectedTimeRange] = useState<
    "24h" | "7d" | "30d" | "all"
  >("30d");
  const [cancelReason, setCancelReason] = useState("");
  const [duelToCancel, setDuelToCancel] = useState<Id<"duels"> | null>(null);

  // Queries
  const searchResults = useQuery(api.duels.searchDuels, {
    ...filters,
    limit: 20,
    offset: 0,
  });

  const analytics = useQuery(api.duels.getDuelAnalytics, {
    timeRange: selectedTimeRange,
  });

  const activeMonitoring = useQuery(api.duels.getActiveDuelMonitoring);

  // Mutations
  const forceCancelDuel = useMutation(api.duels.forceCancelDuel);

  const handleCancelDuel = async () => {
    if (!duelToCancel) return;

    try {
      await forceCancelDuel({
        duelId: duelToCancel,
        reason: cancelReason,
      });
      setDuelToCancel(null);
      setCancelReason("");
    } catch (error) {
      console.error("Failed to cancel duel:", error);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_PLAYERS":
        return <Badge variant="secondary">Waiting</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default">Active</Badge>;
      case "COMPLETED":
        return <Badge variant="outline">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duels</CardTitle>
            <Swords className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalDuels || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last{" "}
              {selectedTimeRange === "all" ? "all time" : selectedTimeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Duels</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics?.statusBreakdown.waiting || 0) +
                (analytics?.statusBreakdown.inProgress || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.statusBreakdown.waiting || 0} waiting,{" "}
              {analytics?.statusBreakdown.inProgress || 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalDuels
                ? Math.round(
                    (analytics.statusBreakdown.completed /
                      analytics.totalDuels) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.statusBreakdown.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rounds</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageRoundsPerDuel || 0}
            </div>
            <p className="text-xs text-muted-foreground">Per completed duel</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Time Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTimeRange}
            onValueChange={(value: "24h" | "7d" | "30d" | "all") =>
              setSelectedTimeRange(value)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Active Duel Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Duel Monitoring
          </CardTitle>
          <CardDescription>
            Real-time monitoring of duels in progress or waiting for players
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeMonitoring ? (
            <div className="text-center py-4">Loading monitoring data...</div>
          ) : activeMonitoring.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active duels to monitor
            </div>
          ) : (
            <div className="space-y-4">
              {activeMonitoring.map((item) => (
                <div key={item.duel._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.duel.status)}
                      <span className="font-medium">
                        {typeof item.duel.numberOfRounds === "number"
                          ? `${item.duel.numberOfRounds} Round Duel`
                          : "Duel to the Death"}
                      </span>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setDuelToCancel(item.duel._id as Id<"duels">)
                          }
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Wizards:</span>
                      <div className="mt-1">
                        {item.wizards.map((wizard) => (
                          <div key={wizard?.id} className="text-xs">
                            {wizard?.name} ({wizard?.owner})
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">
                        {item.duel.status === "WAITING_FOR_PLAYERS" &&
                          item.waitingTime && (
                            <span className="text-orange-600">
                              Waiting {formatDuration(item.waitingTime)}
                            </span>
                          )}
                        {item.duel.status === "IN_PROGRESS" && (
                          <span className="text-green-600">
                            Round {item.duel.currentRound}
                            {item.roundWaitingTime && (
                              <span className="text-orange-600 ml-2">
                                ({formatDuration(item.roundWaitingTime)}{" "}
                                waiting)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="mt-1 text-xs">
                        {new Date(item.duel.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duel Search and Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Duel Search & Management
          </CardTitle>
          <CardDescription>
            Search and filter duels with advanced criteria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status:
                      value === "all"
                        ? undefined
                        : (value as
                            | "WAITING_FOR_PLAYERS"
                            | "IN_PROGRESS"
                            | "COMPLETED"
                            | "CANCELLED"),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="WAITING_FOR_PLAYERS">Waiting</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="player-filter">Player User ID</Label>
              <Input
                id="player-filter"
                placeholder="Enter user ID"
                value={filters.playerUserId || ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    playerUserId: e.target.value || undefined,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="rounds-filter">Round Type</Label>
              <Select
                value={filters.numberOfRounds?.toString() || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    numberOfRounds:
                      value === "all"
                        ? undefined
                        : value === "TO_THE_DEATH"
                          ? "TO_THE_DEATH"
                          : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="3">3 Rounds</SelectItem>
                  <SelectItem value="5">5 Rounds</SelectItem>
                  <SelectItem value="10">10 Rounds</SelectItem>
                  <SelectItem value="TO_THE_DEATH">To the Death</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {!searchResults ? (
              <div className="text-center py-4">Loading search results...</div>
            ) : searchResults.duels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No duels found matching your criteria
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Showing {searchResults.duels.length} of{" "}
                    {searchResults.total} duels
                  </span>
                </div>
                <div className="space-y-2">
                  {searchResults.duels.map((duel) => (
                    <div key={duel._id} className="relative">
                      <DuelListItem
                        duel={duel}
                        variant="card"
                        showActions={false}
                      />
                      {duel.status !== "COMPLETED" && (
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setDuelToCancel(duel._id as Id<"duels">)
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Duel Dialog */}
      <Dialog open={!!duelToCancel} onOpenChange={() => setDuelToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Duel</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this duel? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">
                Reason for cancellation (optional)
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancelling this duel..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuelToCancel(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCancelDuel}>
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
