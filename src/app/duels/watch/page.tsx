"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DuelListItem } from "@/components/DuelListItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { PageHeader } from "@/components/PageHeader";

export default function WatchDuelsPage() {
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const { duels, total, hasMore } = useQuery(api.duels.getWatchableDuels, {
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
    <div className="min-h-screen">
      <div className="@container container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <PageHeader
            className="mb-0"
            title="Watch Duels"
            icon={<Eye className="h-6 w-6" aria-hidden="true" />}
            description="
            Witness epic magical battles from wizards across the platform. Watch
            active duels in progress and explore completed battles to see how
            they unfolded.
          "
          />
        </div>

        {/* Duels List */}
        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            Recent Duels
          </h2>

          {duels === undefined ? (
            <div className="text-center py-12">
              <RuneSpinner size="md" label="Loading…" />
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
            <div className="grid gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
              {duels.map((duel) => (
                <DuelListItem
                  key={duel._id}
                  duel={duel}
                  variant="card"
                  showOnlookers
                />
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
      </div>
    </div>
  );
}
