"use client";

import { useState } from "react";
import Link from "next/link";
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
  hrefFor,
}: {
  title: string;
  rows: Array<{ key: string; costUsd: number; calls: number }>;
  keyLabel: string;
  /** Makes each key a link, e.g. a duel ID to its duel page. */
  hrefFor?: (key: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <Table className="[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4">
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
                    {hrefFor && row.key !== "unknown" ? (
                      <Link
                        href={hrefFor(row.key)}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.key}
                      </Link>
                    ) : (
                      row.key
                    )}
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

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4 sm:p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
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
            compactOnMobile
            className="mb-6 sm:mb-8"
            description="Estimated spend on AI text and image generation"
            icon={<Coins className="h-6 w-6" aria-hidden="true" />}
            actions={
              <Select value={range} onValueChange={changeRange}>
                <SelectTrigger
                  className="w-full sm:w-40"
                  aria-label="Time range"
                >
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
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    This range has more than 8000 calls. Only the oldest 8000
                    are included, so totals are understated. Choose a shorter
                    range.
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <Stat
                  label="Total estimated cost"
                  value={formatUsd(summary.totalCostUsd)}
                />
                <Stat label="AI calls" value={summary.totalCalls} />
                <Stat
                  label="Average cost per duel"
                  value={formatUsd(summary.avgCostPerDuelUsd)}
                />
                <Stat label="Duels with AI usage" value={summary.duelCount} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <TotalsTable
                  title="Most expensive duels"
                  keyLabel="Duel ID"
                  hrefFor={(id) => `/duels/${id}`}
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
