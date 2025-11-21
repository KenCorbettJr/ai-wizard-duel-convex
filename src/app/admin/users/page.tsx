"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserListTable } from "@/components/admin/UserListTable";
import { GrantCreditsModal } from "@/components/admin/GrantCreditsModal";
import { CreditHistoryModal } from "@/components/admin/CreditHistoryModal";
import { UserManagementErrorBoundary } from "@/components/admin/UserManagementErrorBoundary";
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Activity,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SortOption = "joinDate" | "activity" | "username";
type ActivityFilter = "all" | "inactive" | "low" | "medium" | "high";

function UserManagementPageContent() {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("joinDate");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  // Pagination state
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 50,
    cursor: null as string | null,
  });

  // Modal state
  const [grantCreditsUser, setGrantCreditsUser] = useState<{
    userId: string;
    userName: string;
    currentBalance: number;
  } | null>(null);
  const [creditHistoryUser, setCreditHistoryUser] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Create a stable query key to detect filter changes
  const queryKey = useMemo(
    () => `${debouncedSearch}-${sortBy}-${activityFilter}`,
    [debouncedSearch, sortBy, activityFilter]
  );

  // Reset pagination when query key changes
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    if (paginationOpts.cursor !== null) {
      setPaginationOpts({ numItems: 50, cursor: null });
    }
  }

  // Fetch users
  const usersResult = useQuery(api.adminUsers.listUsers, {
    paginationOpts,
    searchQuery: debouncedSearch || undefined,
    sortBy,
    activityFilter: activityFilter !== "all" ? activityFilter : undefined,
  });

  // Fetch platform stats
  const platformStats = useQuery(api.adminUsers.getPlatformStats);

  // Fetch user statistics for all users in current page
  const users = usersResult?.page || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = users.map((user: any) => user.clerkId);

  // Fetch batch statistics for all users at once
  const batchStats = useQuery(
    api.adminUsers.getBatchUserStatistics,
    userIds.length > 0 ? { userIds } : "skip"
  );

  // Build userStats map from batch results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStats = new Map<string, any>();
  if (batchStats) {
    Object.entries(batchStats).forEach(([userId, stats]) => {
      userStats.set(userId, stats);
    });
  }

  // Handle pagination
  const handleNextPage = () => {
    if (usersResult && !usersResult.isDone) {
      setPaginationOpts({
        numItems: 50,
        cursor: usersResult.continueCursor,
      });
    }
  };

  const handlePreviousPage = () => {
    setPaginationOpts({
      numItems: 50,
      cursor: null,
    });
  };

  const isLoading = usersResult === undefined;
  const hasNextPage = usersResult && !usersResult.isDone;
  const hasPreviousPage = paginationOpts.cursor !== null;

  // Calculate display info
  const startIndex = 1;
  const endIndex = users.length;
  const totalDisplay = platformStats?.totalUsers || "...";

  // Check for query errors
  const hasQueryError = usersResult === null;
  const hasStatsError = platformStats === null;

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <div className="w-full px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-linear-to-br from-blue-600 to-purple-600">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                User Management
              </h1>
              <p className="text-muted-foreground text-lg">
                View and manage all platform users
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert for Stats */}
        {hasStatsError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load platform statistics. Please refresh the page or try
              again later.
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformStats === undefined ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-2xl font-bold">
                      {platformStats?.totalUsers || "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All registered users
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformStats === undefined ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold">
                      {platformStats?.activeUsers24h || "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 24 hours
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active (7d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformStats === undefined ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    <span className="text-2xl font-bold">
                      {platformStats?.activeUsers7d || "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 7 days
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Wizards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {platformStats === undefined ? (
                <div className="space-y-2">
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                    <span className="text-2xl font-bold">
                      {platformStats?.totalWizards || "--"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created by users
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                {isLoading && debouncedSearch ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  placeholder="Search by name, email, or user ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joinDate">Join Date</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="username">Username</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Activity Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={activityFilter}
                  onValueChange={(value) =>
                    setActivityFilter(value as ActivityFilter)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by activity..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="high">High Activity</SelectItem>
                    <SelectItem value="medium">Medium Activity</SelectItem>
                    <SelectItem value="low">Low Activity</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert for User List */}
        {hasQueryError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Failed to load user list. This may be due to a network error or
                authorization issue.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* User List Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <UserListTable
              users={users}
              userStats={userStats}
              isLoading={isLoading}
              onGrantCredits={(userId, userName, currentBalance) =>
                setGrantCreditsUser({ userId, userName, currentBalance })
              }
              onViewCreditHistory={(userId, userName) =>
                setCreditHistoryUser({ userId, userName })
              }
              onSortChange={setSortBy}
            />

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex}-{endIndex} of {totalDisplay} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!hasPreviousPage || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!hasNextPage || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {grantCreditsUser && (
        <GrantCreditsModal
          isOpen={true}
          userId={grantCreditsUser.userId}
          userName={grantCreditsUser.userName}
          currentBalance={grantCreditsUser.currentBalance}
          onClose={() => setGrantCreditsUser(null)}
          onSuccess={() => {
            setGrantCreditsUser(null);
            // Data will refresh automatically via Convex reactivity
          }}
        />
      )}

      {creditHistoryUser && (
        <CreditHistoryModal
          isOpen={true}
          userId={creditHistoryUser.userId}
          userName={creditHistoryUser.userName}
          onClose={() => setCreditHistoryUser(null)}
        />
      )}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <UserManagementErrorBoundary>
      <UserManagementPageContent />
    </UserManagementErrorBoundary>
  );
}
