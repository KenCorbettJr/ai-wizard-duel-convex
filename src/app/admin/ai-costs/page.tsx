"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Coins, AlertTriangle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Range = "24h" | "7d" | "30d" | "all";

const RANGE_MS: Record<Exclude<Range, "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const formatUsd = (value: number) => `$${value.toFixed(value < 1 ? 4 : 2)}`;

function TotalsTable({
  title,
  rows,
  keyLabel,
}: {
  title: string;
  rows: Array<{ key: string; costUsd: number; calls: number }>;
  keyLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{keyLabel}</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-mono text-xs break-all">
                    {row.key}
                  </TableCell>
                  <TableCell className="text-right">{row.calls}</TableCell>
                  <TableCell className="text-right">
                    {formatUsd(row.costUsd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function AiCostsPage() {
  const [range, setRange] = useState<Range>("30d");
  // Stored in state so the query args stay stable between renders
  const [sinceMs, setSinceMs] = useState(() => Date.now() - RANGE_MS["30d"]);

  const changeRange = (value: Range) => {
    setRange(value);
    setSinceMs(value === "all" ? 0 : Date.now() - RANGE_MS[value]);
  };
  const summary = useQuery(api.aiUsage.getCostSummary, { sinceMs });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <PageHeader
            title="AI Costs"
            description="Estimated spend on AI text and image generation"
            icon={<Coins className="h-6 w-6" aria-hidden="true" />}
            actions={
              <Select value={range} onValueChange={changeRange}>
                <SelectTrigger className="w-40" aria-label="Time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          {summary === undefined ? (
            <div className="flex justify-center py-16">
              <RuneSpinner size="md" label="Loading costs…" />
            </div>
          ) : (
            <div className="space-y-6">
              {summary.truncated && (
                <Card className="border-warning/40 bg-warning/10">
                  <CardContent className="flex items-center gap-2 py-4 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    This range has more than 8000 calls. Only the oldest 8000
                    are included, so totals are understated. Choose a shorter
                    range.
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Total estimated cost</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-bold">
                    {formatUsd(summary.totalCostUsd)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>AI calls</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-bold">
                    {summary.totalCalls}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Average cost per duel</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-bold">
                    {formatUsd(summary.avgCostPerDuelUsd)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Duels with AI usage</CardTitle>
                  </CardHeader>
                  <CardContent className="text-3xl font-bold">
                    {summary.duelCount}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <TotalsTable
                  title="Most expensive duels"
                  keyLabel="Duel ID"
                  rows={summary.byDuel}
                />
                <TotalsTable
                  title="By feature"
                  keyLabel="Feature"
                  rows={summary.byFeature}
                />
                <TotalsTable
                  title="By provider / model"
                  keyLabel="Model"
                  rows={summary.byProvider}
                />
                <TotalsTable
                  title="By day"
                  keyLabel="Day (UTC)"
                  rows={summary.byDay}
                />
                <TotalsTable
                  title="Top users"
                  keyLabel="User ID"
                  rows={summary.byUser}
                />
              </div>
            </div>
          )}
        </SuperAdminOnly>
      </div>
    </div>
  );
}
