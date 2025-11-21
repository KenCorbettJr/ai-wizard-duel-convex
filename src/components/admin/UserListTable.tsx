"use client";

import { useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ExternalLink,
  Coins,
  User,
  Shield,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { UserStatsCard } from "./UserStatsCard";
import { UserListTableSkeleton } from "./UserListTableSkeleton";

type UserData = {
  _id: Id<"users">;
  clerkId: string;
  email?: string;
  name?: string;
  userId?: string;
  displayName?: string;
  subscriptionTier: "FREE" | "PREMIUM";
  subscriptionStatus: "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING";
  imageCredits: number;
  createdAt: number;
  role: "user" | "admin" | "super_admin";
};

type UserStatistics = {
  totalWizards: number;
  multiplayerDuels: {
    total: number;
    wins: number;
    losses: number;
    inProgress: number;
  };
  campaignBattles: {
    total: number;
    wins: number;
    losses: number;
    currentProgress: number;
  };
  lastActivityAt?: number;
  activityLevel: "inactive" | "low" | "medium" | "high";
};

interface UserListTableProps {
  users: UserData[];
  userStats: Map<string, UserStatistics>;
  onGrantCredits: (
    userId: string,
    userName: string,
    currentBalance: number
  ) => void;
  onViewCreditHistory?: (userId: string, userName: string) => void;
  onSortChange?: (sortBy: "joinDate" | "activity" | "username") => void;
  isLoading?: boolean;
}

export function UserListTable({
  users,
  userStats,
  onGrantCredits,
  onViewCreditHistory,
  onSortChange,
  isLoading = false,
}: UserListTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleSort = (column: "joinDate" | "activity" | "username") => {
    onSortChange?.(column);
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const getActivityBadge = (
    activityLevel: "inactive" | "low" | "medium" | "high"
  ) => {
    switch (activityLevel) {
      case "inactive":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300"
          >
            Inactive
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
          >
            Low
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Medium
          </Badge>
        );
      case "high":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
          >
            High
          </Badge>
        );
    }
  };

  const getSubscriptionBadge = (tier: "FREE" | "PREMIUM") => {
    if (tier === "PREMIUM") {
      return (
        <Badge className="bg-linear-to-r from-yellow-400 to-yellow-600 text-white border-0">
          Premium
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Free
      </Badge>
    );
  };

  const getRoleBadge = (role: "user" | "admin" | "super_admin") => {
    switch (role) {
      case "super_admin":
        return (
          <Badge
            variant="default"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUserDisplayName = (user: UserData) => {
    return user.displayName || user.name || user.userId || "Unknown User";
  };

  if (isLoading) {
    return <UserListTableSkeleton rows={10} />;
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No users found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or filter criteria
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead className="min-w-[200px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("username")}
                  className="h-8 px-2"
                >
                  User
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="min-w-[120px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("joinDate")}
                  className="h-8 px-2"
                >
                  Join Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort("activity")}
                  className="h-8 px-2"
                >
                  Activity
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center w-20">Wizards</TableHead>
              <TableHead className="text-center w-24">Duels</TableHead>
              <TableHead className="text-center w-24">Campaign</TableHead>
              <TableHead className="text-center w-20">Credits</TableHead>
              <TableHead className="w-28">Subscription</TableHead>
              <TableHead className="text-right min-w-[280px] sticky right-0 bg-background">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const stats = userStats.get(user.clerkId);
              const hasZeroCredits = user.imageCredits === 0;
              const isExpanded = expandedUserId === user.clerkId;

              return (
                <>
                  <TableRow key={user._id} className="group">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(user.clerkId)}
                        className="h-8 w-8 p-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getUserDisplayName(user)}
                          </span>
                          {getRoleBadge(user.role)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {user.userId || user.clerkId.slice(0, 12)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[180px]">
                        {user.email || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDate(user.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {stats ? (
                        getActivityBadge(stats.activityLevel)
                      ) : (
                        <Badge variant="outline">Loading...</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {stats?.totalWizards ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {stats ? (
                        <div className="flex flex-col items-center">
                          <span className="font-medium">
                            {stats.multiplayerDuels.total}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {stats.multiplayerDuels.wins}W /{" "}
                            {stats.multiplayerDuels.losses}L
                          </span>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {stats ? (
                        <div className="flex flex-col items-center">
                          <span className="font-medium">
                            {stats.campaignBattles.total}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Progress: {stats.campaignBattles.currentProgress}
                          </span>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Coins
                          className={`h-4 w-4 ${hasZeroCredits ? "text-red-500" : "text-yellow-500"}`}
                        />
                        <span
                          className={`font-medium ${hasZeroCredits ? "text-red-600 dark:text-red-400" : ""}`}
                        >
                          {user.imageCredits}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(user.subscriptionTier)}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-background">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/users/${user.userId || user.clerkId}`}
                            target="_blank"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Profile
                          </Link>
                        </Button>
                        {onViewCreditHistory && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onViewCreditHistory(
                                user.clerkId,
                                getUserDisplayName(user)
                              )
                            }
                          >
                            <Coins className="h-4 w-4 mr-1" />
                            History
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            onGrantCredits(
                              user.clerkId,
                              getUserDisplayName(user),
                              user.imageCredits
                            )
                          }
                        >
                          <Coins className="h-4 w-4 mr-1" />
                          Grant
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && stats && (
                    <TableRow key={`${user._id}-expanded`}>
                      <TableCell
                        colSpan={11}
                        className="bg-muted/30 p-6 sticky left-0 right-0"
                      >
                        <UserStatsCard
                          stats={stats}
                          userName={getUserDisplayName(user)}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - Visible only on mobile/tablet */}
      <div className="lg:hidden space-y-4">
        {users.map((user) => {
          const stats = userStats.get(user.clerkId);
          const hasZeroCredits = user.imageCredits === 0;
          const isExpanded = expandedUserId === user.clerkId;

          return (
            <div
              key={user._id}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              {/* Header with name and expand button */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">
                      {getUserDisplayName(user)}
                    </h3>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.userId || user.clerkId.slice(0, 12)}
                  </p>
                  {user.email && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(user.clerkId)}
                  className="h-8 w-8 p-0 shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Key metrics in grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Activity</p>
                  <div className="mt-1">
                    {stats ? (
                      getActivityBadge(stats.activityLevel)
                    ) : (
                      <Badge variant="outline">Loading...</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Credits</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Coins
                      className={`h-4 w-4 ${hasZeroCredits ? "text-red-500" : "text-yellow-500"}`}
                    />
                    <span
                      className={`font-medium ${hasZeroCredits ? "text-red-600 dark:text-red-400" : ""}`}
                    >
                      {user.imageCredits}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Joined</p>
                  <p className="font-medium mt-1">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Subscription</p>
                  <div className="mt-1">
                    {getSubscriptionBadge(user.subscriptionTier)}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && stats && (
                <div className="pt-3 border-t">
                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Wizards</p>
                      <p className="font-medium text-lg mt-1">
                        {stats.totalWizards}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Duels</p>
                      <p className="font-medium text-lg mt-1">
                        {stats.multiplayerDuels.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stats.multiplayerDuels.wins}W /{" "}
                        {stats.multiplayerDuels.losses}L
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Campaign</p>
                      <p className="font-medium text-lg mt-1">
                        {stats.campaignBattles.total}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lvl {stats.campaignBattles.currentProgress}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link
                    href={`/users/${user.userId || user.clerkId}`}
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Profile
                  </Link>
                </Button>
                {onViewCreditHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      onViewCreditHistory(
                        user.clerkId,
                        getUserDisplayName(user)
                      )
                    }
                  >
                    <Coins className="h-4 w-4 mr-1" />
                    History
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    onGrantCredits(
                      user.clerkId,
                      getUserDisplayName(user),
                      user.imageCredits
                    )
                  }
                >
                  <Coins className="h-4 w-4 mr-1" />
                  Grant
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
