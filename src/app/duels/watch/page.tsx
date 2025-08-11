"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import { DuelListItem } from "@/components/DuelListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Clock, Trophy, Users } from "lucide-react";

export default function WatchDuelsPage() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { duels, total, hasMore } = useQuery(api.duels.getAllRecentDuels, {
    limit,
    offset,
  }) || { duels: [], total: 0, hasMore: false };

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  const loadPrevious = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <Navbar />

      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-4xl font-bold text-foreground">Watch Duels</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Witness epic magical battles from wizards across the platform. Watch
            active duels in progress and explore completed battles to see how
            they unfolded.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{total}</p>
                  <p className="text-sm text-muted-foreground">
                    Watchable Duels
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {duels.filter((d) => d.status === "IN_PROGRESS").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Duels</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {duels.filter((d) => d.status === "COMPLETED").length}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Completed Duels
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Duels List */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Recent Duels
          </h2>

          {duels === undefined ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 dark:border-purple-400 mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading duels...</p>
            </div>
          ) : duels.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No duels found</h3>
                <p className="text-muted-foreground">
                  There are no duels to watch yet. Check back later for epic
                  magical battles!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {duels.map((duel) => (
                <DuelListItem key={duel._id} duel={duel} variant="card" />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {(offset > 0 || hasMore) && (
          <div className="flex justify-center gap-4">
            {offset > 0 && (
              <Button
                variant="outline"
                onClick={loadPrevious}
                disabled={duels === undefined}
              >
                Previous
              </Button>
            )}
            {hasMore && (
              <Button onClick={loadMore} disabled={duels === undefined}>
                Load More
              </Button>
            )}
          </div>
        )}

        {/* Pagination Info */}
        {total > 0 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}{" "}
            duels
          </div>
        )}
      </main>
    </div>
  );
}
