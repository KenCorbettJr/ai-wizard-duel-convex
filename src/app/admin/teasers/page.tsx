"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Clapperboard,
  Download,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
  MonitorPlay,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RuneSpinner } from "@/components/ui/rune-spinner";

type Data = NonNullable<
  ReturnType<typeof useQuery<typeof api.teasers.listTeasers>>
>;
type Row = Data["teasers"][number];

const STATUS: Record<
  Row["status"],
  {
    label: string;
    variant:
      "info" | "warning" | "success" | "destructive" | "secondary" | "gold";
  }
> = {
  DRAFTING: { label: "Writing & voicing", variant: "info" },
  RENDERING: { label: "Rendering", variant: "info" },
  READY: { label: "Needs review", variant: "gold" },
  PUBLISHING: { label: "Posting to YouTube", variant: "info" },
  PUBLISHED: { label: "Published", variant: "success" },
  REJECTED: { label: "Rejected", variant: "secondary" },
  FAILED: { label: "Failed", variant: "destructive" },
};

/** Accepts a duel ID or a link to a duel page. */
function duelIdFrom(input: string): string {
  const text = input.trim();
  const match = text.match(/\/duels\/([^/?#]+)/);
  return match ? match[1] : text;
}

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^.*Uncaught Error: /, "").split("\n")[0]
          : "Something went wrong",
      );
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function NewTeaser() {
  const create = useMutation(api.teasers.createTeaserForDuel);
  const [duel, setDuel] = useState("");
  const [aiMotion, setAiMotion] = useState(false);
  const { busy, error, run } = useRun();
  return (
    <Card className="mb-8">
      <CardContent className="space-y-3 pt-6">
        <Label htmlFor="teaser-duel">Make a teaser for a specific duel</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            id="teaser-duel"
            placeholder="Duel link or ID"
            value={duel}
            onChange={(e) => setDuel(e.target.value)}
            className="sm:max-w-md"
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={aiMotion}
              onCheckedChange={(v) => setAiMotion(v === true)}
            />
            Animate pictures with AI (about $1)
          </label>
          <Button
            disabled={busy || !duel.trim()}
            onClick={() =>
              run(async () => {
                await create({
                  duelId: duelIdFrom(duel) as Id<"duels">,
                  aiMotion,
                });
                setDuel("");
              })
            }
          >
            <Clapperboard aria-hidden="true" />
            Make teaser
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TeaserCard({
  row,
  youtubeConnected,
}: {
  row: Row;
  youtubeConnected: boolean;
}) {
  const approve = useMutation(api.teasers.approveTeaser);
  const reject = useMutation(api.teasers.rejectTeaser);
  const regenerate = useMutation(api.teasers.regenerateTeaser);
  const rerender = useMutation(api.teasers.rerenderTeaser);
  const unpublish = useMutation(api.teasers.unpublishTeaser);
  const setYouTube = useMutation(api.teasers.setTeaserYouTubeUrl);
  const [title, setTitle] = useState(row.title ?? "");
  const [description, setDescription] = useState(row.description ?? "");
  const [youtubeLink, setYoutubeLink] = useState("");
  const { busy, error, run } = useRun();
  const status = STATUS[row.status];
  const working = ["DRAFTING", "RENDERING", "PUBLISHING"].includes(row.status);

  return (
    <Card
      className={row.status === "READY" ? "ring-2 ring-gold/60" : undefined}
    >
      <CardContent className="flex flex-col gap-6 pt-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-64">
          {row.videoUrl ? (
            <video
              src={row.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="aspect-9/16 w-full rounded-lg bg-black"
            />
          ) : (
            <div className="flex aspect-9/16 w-full items-center justify-center rounded-lg bg-secondary/40">
              {working ? (
                <RuneSpinner size="md" label={status.label} />
              ) : (
                <span className="text-sm text-muted-foreground">No video</span>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {row.aiMotion && (
                <Badge variant="info">
                  <Sparkles className="mr-1 size-3" aria-hidden="true" />
                  AI motion
                </Badge>
              )}
              <Badge variant="secondary">
                {row.source === "daily" ? "Daily pick" : "Admin pick"}
              </Badge>
            </div>
            <Link
              href={`/duels/${row.duelId}`}
              className="font-display text-lg font-semibold hover:underline"
            >
              {row.duelTitle}
            </Link>
            <p className="text-sm text-muted-foreground">
              {new Date(row.createdAt).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {row.pickReason && ` · ${row.pickReason}`}
            </p>
          </div>

          {row.error && (
            <p
              className={`text-sm ${row.status === "FAILED" ? "text-destructive" : "text-warning"}`}
            >
              {row.error}
            </p>
          )}

          {row.lines.length > 0 && (
            <ol className="space-y-1 text-sm">
              {row.lines.map((line, i) => (
                <li key={i}>
                  <span className="text-muted-foreground">
                    {line.kind === "hook"
                      ? "Hook"
                      : line.kind === "outro"
                        ? "Ending"
                        : line.roundNumber === 0
                          ? "Intro"
                          : `Round ${line.roundNumber}`}
                    {line.animated && " ✦"}:
                  </span>{" "}
                  {line.line}
                </li>
              ))}
            </ol>
          )}

          {row.status === "READY" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`title-${row._id}`}>YouTube title</Label>
                <Input
                  id={`title-${row._id}`}
                  value={title}
                  maxLength={100}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`desc-${row._id}`}>
                  Description (a link to the duel and hashtags are added)
                </Label>
                <Textarea
                  id={`desc-${row._id}`}
                  value={description}
                  rows={2}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {row.youtubeUrl && (
            <a
              href={row.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MonitorPlay className="size-4" aria-hidden="true" />{" "}
              {row.youtubeUrl}
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}

          <div className="flex flex-wrap gap-2">
            {row.status === "READY" && (
              <>
                <Button
                  variant="gold"
                  disabled={busy || !youtubeConnected}
                  title={
                    youtubeConnected
                      ? undefined
                      : "Connect YouTube first (see video/README.md)"
                  }
                  onClick={() =>
                    run(() =>
                      approve({
                        teaserId: row._id,
                        postToYouTube: true,
                        title,
                        description,
                      }),
                    )
                  }
                >
                  <MonitorPlay aria-hidden="true" />
                  Approve & post to YouTube
                </Button>
                <Button
                  variant="success"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      approve({
                        teaserId: row._id,
                        postToYouTube: false,
                        title,
                        description,
                      }),
                    )
                  }
                >
                  <Check aria-hidden="true" />
                  Approve for the duel page
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => reject({ teaserId: row._id }))}
                >
                  <X aria-hidden="true" />
                  Reject
                </Button>
              </>
            )}
            {(row.status === "READY" ||
              row.status === "FAILED" ||
              row.status === "REJECTED") && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      regenerate({ teaserId: row._id, aiMotion: false }),
                    )
                  }
                >
                  <RefreshCw aria-hidden="true" />
                  New script
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(() => regenerate({ teaserId: row._id, aiMotion: true }))
                  }
                >
                  <Wand2 aria-hidden="true" />
                  New script with AI motion
                </Button>
              </>
            )}
            {(row.status === "FAILED" || row.status === "RENDERING") &&
              row.lines.length > 0 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => rerender({ teaserId: row._id }))}
                >
                  <Clapperboard aria-hidden="true" />
                  Render again
                </Button>
              )}
            {row.videoUrl && (
              <Button variant="ghost" asChild>
                <a
                  href={row.videoUrl}
                  download={`teaser-${row._id}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download aria-hidden="true" />
                  Download
                </a>
              </Button>
            )}
            {row.status === "PUBLISHED" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => run(() => unpublish({ teaserId: row._id }))}
              >
                Take off duel page
              </Button>
            )}
          </div>

          {row.status === "PUBLISHED" && !row.youtubeUrl && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Uploaded it yourself? Paste the YouTube link"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
              />
              <Button
                variant="outline"
                disabled={busy || !youtubeLink.trim()}
                onClick={() =>
                  run(() => setYouTube({ teaserId: row._id, url: youtubeLink }))
                }
              >
                Save link
              </Button>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Teasers() {
  const data = useQuery(api.teasers.listTeasers, {});
  return (
    <>
      <PageHeader
        title="Duel Teasers"
        description="Short, spoiler-free trailers of popular duels for YouTube Shorts. One is drafted each morning from yesterday's most popular duel. Nothing is posted until you approve it, and approved teasers appear on their duel page."
        icon={<Clapperboard className="h-6 w-6" aria-hidden="true" />}
      />
      {data && !data.youtubeConnected && (
        <p className="mb-4 text-sm text-muted-foreground">
          YouTube isn&apos;t connected, so approved teasers go on the duel page
          only. Download them to post by hand, or see video/README.md to connect
          a channel.
        </p>
      )}
      <NewTeaser />
      {data === undefined ? (
        <div className="py-12 text-center">
          <RuneSpinner size="md" label="Loading teasers…" />
        </div>
      ) : data.teasers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No teasers yet. Make one above, or turn on the daily pick with
            TEASERS_ENABLED.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.teasers.map((row) => (
            <TeaserCard
              key={`${row._id}:${row.title ?? ""}`}
              row={row}
              youtubeConnected={data.youtubeConnected}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function TeasersPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <Teasers />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
