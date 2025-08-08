"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConvexImage } from "@/components/ConvexImage";
import {
  Search,
  Filter,
  X,
  Calendar,
  Users,
  Swords,
  ExternalLink,
} from "lucide-react";

interface DuelFilters {
  status?: "WAITING_FOR_PLAYERS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  playerUserId?: string;
  wizardId?: Id<"wizards">;
  numberOfRounds?: number | "TO_THE_DEATH";
  createdAfter?: number;
  createdBefore?: number;
}

interface DuelSearchFilterProps {
  showPlayerFilter?: boolean;
  showWizardFilter?: boolean;
  defaultFilters?: DuelFilters;
  onDuelSelect?: (duelId: Id<"duels">) => void;
  compact?: boolean;
}

export function DuelSearchFilter({
  showPlayerFilter = true,

  defaultFilters = {},
  onDuelSelect,
  compact = false,
}: DuelSearchFilterProps) {
  const [filters, setFilters] = useState<DuelFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = compact ? 5 : 10;

  // Search query
  const searchResults = useQuery(api.duels.searchDuels, {
    ...filters,
    limit: pageSize,
    offset: currentPage * pageSize,
  });

  const updateFilter = (
    key: keyof DuelFilters,
    value: string | number | undefined
  ) => {
    setFilters({ ...filters, [key]: value || undefined });
    setCurrentPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setCurrentPage(0);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined
  );

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Duel Search
              </CardTitle>
              {!compact && (
                <CardDescription>
                  Search and filter duels with advanced criteria
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center"
                >
                  {Object.values(filters).filter((v) => v !== undefined).length}
                </Badge>
              )}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  value={filters.status || ""}
                  onValueChange={(value) => updateFilter("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="WAITING_FOR_PLAYERS">
                      Waiting for Players
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Round Type Filter */}
              <div>
                <Label htmlFor="rounds-filter">Round Type</Label>
                <Select
                  value={filters.numberOfRounds?.toString() || ""}
                  onValueChange={(value) =>
                    updateFilter(
                      "numberOfRounds",
                      value === "TO_THE_DEATH"
                        ? "TO_THE_DEATH"
                        : value
                          ? parseInt(value)
                          : undefined
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="3">3 Rounds</SelectItem>
                    <SelectItem value="5">5 Rounds</SelectItem>
                    <SelectItem value="10">10 Rounds</SelectItem>
                    <SelectItem value="TO_THE_DEATH">To the Death</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Player Filter */}
              {showPlayerFilter && (
                <div>
                  <Label htmlFor="player-filter">Player User ID</Label>
                  <Input
                    id="player-filter"
                    placeholder="Enter user ID"
                    value={filters.playerUserId || ""}
                    onChange={(e) =>
                      updateFilter("playerUserId", e.target.value)
                    }
                  />
                </div>
              )}
            </div>

            {/* Date Range Filters */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-after">Created After</Label>
                <Input
                  id="date-after"
                  type="datetime-local"
                  value={
                    filters.createdAfter
                      ? new Date(filters.createdAfter)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    updateFilter(
                      "createdAfter",
                      e.target.value
                        ? new Date(e.target.value).getTime()
                        : undefined
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="date-before">Created Before</Label>
                <Input
                  id="date-before"
                  type="datetime-local"
                  value={
                    filters.createdBefore
                      ? new Date(filters.createdBefore)
                          .toISOString()
                          .slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    updateFilter(
                      "createdBefore",
                      e.target.value
                        ? new Date(e.target.value).getTime()
                        : undefined
                    )
                  }
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search Results</CardTitle>
            {searchResults && (
              <div className="text-sm text-muted-foreground">
                Showing {searchResults.duels.length} of {searchResults.total}{" "}
                duels
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!searchResults ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading search results...</p>
            </div>
          ) : searchResults.duels.length === 0 ? (
            <div className="text-center py-8">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No duels found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or clearing filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.duels.map((duel) => (
                <DuelResultCard
                  key={duel._id}
                  duel={duel}
                  compact={compact}
                  onSelect={onDuelSelect}
                />
              ))}

              {/* Pagination */}
              {searchResults.total > pageSize && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of{" "}
                    {Math.ceil(searchResults.total / pageSize)}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!searchResults.hasMore}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface DuelResultCardProps {
  duel: {
    _id: Id<"duels">;
    status: string;
    numberOfRounds: number | "TO_THE_DEATH";
    players: string[];
    wizards: Id<"wizards">[];
    currentRound: number;
    createdAt: number;
    shortcode?: string;
    featuredIllustration?: string;
  };
  compact?: boolean;
  onSelect?: (duelId: Id<"duels">) => void;
}

function DuelResultCard({
  duel,
  compact = false,
  onSelect,
}: DuelResultCardProps) {
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

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {duel.featuredIllustration && !compact && (
            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
              <ConvexImage
                storageId={duel.featuredIllustration}
                alt="Duel illustration"
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              {getStatusBadge(duel.status)}
              <span className="font-medium">
                {typeof duel.numberOfRounds === "number"
                  ? `${duel.numberOfRounds} Round Duel`
                  : "Duel to the Death"}
              </span>
              {duel.shortcode && (
                <code className="text-xs px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                  {duel.shortcode}
                </code>
              )}
            </div>

            {!compact && (
              <div className="text-sm text-muted-foreground">
                Created {new Date(duel.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelect?.(duel._id)}
            asChild={!onSelect}
          >
            {onSelect ? (
              "Select"
            ) : (
              <a
                href={`/duels/${duel._id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View
              </a>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{duel.players.length} players</span>
        </div>

        <div className="flex items-center gap-1">
          <Swords className="h-4 w-4 text-muted-foreground" />
          <span>{duel.wizards.length} wizards</span>
        </div>

        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Round {duel.currentRound}</span>
        </div>

        <div className="text-muted-foreground">
          {compact
            ? new Date(duel.createdAt).toLocaleDateString()
            : new Date(duel.createdAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
