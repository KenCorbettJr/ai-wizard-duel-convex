"use client";

import { useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/PageHeader";
import { RuneSpinner } from "@/components/ui/rune-spinner";

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
  // Cursors of the pages before this one
  const [pageCursors, setPageCursors] = useState<(string | null)[]>([]);

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
    [debouncedSearch, sortBy, activityFilter],
  );

  // Reset pagination when query key changes
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    if (paginationOpts.cursor !== null) {
      setPaginationOpts({ numItems: 50, cursor: null });
    }
    if (pageCursors.length > 0) setPageCursors([]);
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
    userIds.length > 0 ? { userIds } : "skip",
  );

  // Build userStats map from batch results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userStats = new Map<string, any>();
  if (batchStats) {
    Object.entries(batchStats).forEach(([userId, stats]) => {
      userStats.set(userId, stats);
    });
  }

  // After paging, bring the top of the new page into view (the pager sits
  // below 50 cards, so otherwise a phone is left at the bottom of the list)
  const userListRef = useRef<HTMLDivElement>(null);
  const scrollToList = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    userListRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  // Handle pagination: remember each page's cursor so Previous steps back one page
  const handleNextPage = () => {
    if (usersResult && !usersResult.isDone) {
      setPageCursors([...pageCursors, paginationOpts.cursor]);
      setPaginationOpts({
        numItems: 50,
        cursor: usersResult.continueCursor,
      });
      scrollToList();
    }
  };

  const handlePreviousPage = () => {
    const previous = pageCursors.at(-1) ?? null;
    setPageCursors(pageCursors.slice(0, -1));
    setPaginationOpts({
      numItems: 50,
      cursor: previous,
    });
    scrollToList();
  };

  const isLoading = usersResult === undefined;
  const hasNextPage = usersResult && !usersResult.isDone;
  const hasPreviousPage = paginationOpts.cursor !== null;

  // Calculate display info
  const startIndex = users.length === 0 ? 0 : pageCursors.length * 50 + 1;
  const endIndex = pageCursors.length * 50 + users.length;
  const totalDisplay = platformStats?.totalUsers || "...";

  // Check for query errors
  const hasQueryError = usersResult === null;
  const hasStatsError = platformStats === null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <PageHeader
            className="mb-0"
            compactOnMobile
            title="User Management"
            description="View and manage all platform users"
            icon={<Users className="h-6 w-6" aria-hidden="true" />}
          />
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
        <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-6">
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
                    <Users className="h-5 w-5 text-info" />
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
                    <Activity className="h-5 w-5 text-success" />
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
                    <Activity className="h-5 w-5 text-primary" />
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
                    <Sparkles className="h-5 w-5 text-warning" />
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
          <CardContent className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="grid gap-3 md:grid-cols-3 md:gap-4">
              {/* Search */}
              <div className="relative">
                {/* Spinner and icon share one fixed slot, so the field never jumps */}
                <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center">
                  {isLoading && debouncedSearch ? (
                    <RuneSpinner size="xs" label="Searching…" />
                  ) : (
                    <Search
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {/* Never disabled: disabling a focused input closes the phone keyboard */}
                <Input
                  type="search"
                  enterKeyHint="search"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="Search users"
                  placeholder="Search name, email, or user ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortOption)}
                >
                  <SelectTrigger aria-label="Sort users">
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
                  <SelectTrigger aria-label="Filter by activity">
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
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
        <Card
          ref={userListRef}
          className="scroll-mt-[calc(var(--app-navbar-h)+4rem)] md:scroll-mt-6"
        >
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
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
            <div className="mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex}-{endIndex} of {totalDisplay} users
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
