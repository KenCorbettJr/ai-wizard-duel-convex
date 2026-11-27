"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  ExternalLink,
  HeartHandshake,
  Pencil,
  Plus,
  Square,
  Trash2,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SuperAdminOnly } from "@/components/SuperAdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RuneSpinner } from "@/components/ui/rune-spinner";

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.sponsorships.list>>
>[number];

const STATUS: Record<
  Row["status"],
  { label: string; variant: "info" | "success" | "warning" | "secondary" }
> = {
  UPCOMING: { label: "Scheduled", variant: "info" },
  RUNNING: { label: "Running", variant: "success" },
  BUDGET_SPENT: { label: "Budget spent", variant: "warning" },
  ENDED: { label: "Ended", variant: "secondary" },
};

const DAY = 24 * 60 * 60 * 1000;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Epoch ms to the value a datetime-local input wants, in local time. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatWhen(ms: number): string {
  return new Date(ms).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function errorMessage(error: unknown): string {
  return error instanceof ConvexError && typeof error.data === "string"
    ? error.data
    : "Something went wrong. Please try again.";
}

interface FormState {
  sponsorName: string;
  message: string;
  url: string;
  logoStorageId?: Id<"_storage">;
  logoPreview: string | null;
  startsAt: string;
  endsAt: string;
  maxEntries: string;
  dailyEntriesPerPlayer: string;
}

function emptyForm(): FormState {
  // Default: a week starting at the next whole hour
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  return {
    sponsorName: "",
    message: "",
    url: "",
    logoPreview: null,
    startsAt: toLocalInput(start.getTime()),
    endsAt: toLocalInput(start.getTime() + 7 * DAY),
    maxEntries: "",
    dailyEntriesPerPlayer: "10",
  };
}

function formFrom(row: Row): FormState {
  return {
    sponsorName: row.sponsorName,
    message: row.message ?? "",
    url: row.url ?? "",
    logoStorageId: row.logoStorageId ?? undefined,
    logoPreview: row.logoUrl,
    startsAt: toLocalInput(row.startsAt),
    endsAt: toLocalInput(row.endsAt),
    maxEntries: row.maxEntries?.toString() ?? "",
    dailyEntriesPerPlayer: row.dailyEntriesPerPlayer?.toString() ?? "",
  };
}

function SponsorshipForm({
  editing,
  onDone,
}: {
  editing: Row | null;
  onDone: () => void;
}) {
  const create = useMutation(api.sponsorships.create);
  const update = useMutation(api.sponsorships.update);
  const generateLogoUploadUrl = useMutation(
    api.sponsorships.generateLogoUploadUrl,
  );
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    editing ? formFrom(editing) : emptyForm(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("The logo must be a PNG, JPEG, WebP or SVG image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("The logo must be under 1 MB.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateLogoUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const { storageId } = (await res.json()) as {
        storageId: Id<"_storage">;
      };
      setForm((f) => ({
        ...f,
        logoStorageId: storageId,
        logoPreview: URL.createObjectURL(file),
      }));
    } catch {
      setError("The logo didn't upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const optionalNumber = (value: string) =>
    value.trim() === "" ? undefined : Number(value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fields = {
      sponsorName: form.sponsorName,
      message: form.message || undefined,
      url: form.url || undefined,
      logoStorageId: form.logoStorageId,
      startsAt: new Date(form.startsAt).getTime(),
      endsAt: new Date(form.endsAt).getTime(),
      maxEntries: optionalNumber(form.maxEntries),
      dailyEntriesPerPlayer: optionalNumber(form.dailyEntriesPerPlayer),
    };
    try {
      if (editing) {
        await update({ sponsorshipId: editing._id, ...fields });
      } else {
        await create(fields);
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardContent className="py-5">
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-lg font-semibold">
            {editing ? `Edit ${editing.sponsorName}` : "New sponsorship"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-name">Sponsor name</Label>
              <Input
                id="sponsor-name"
                required
                maxLength={60}
                value={form.sponsorName}
                onChange={set("sponsorName")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-url">Link (optional)</Label>
              <Input
                id="sponsor-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.url}
                onChange={set("url")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sponsor-logo">Logo (optional)</Label>
              <div className="flex flex-wrap items-center gap-3">
                {form.logoPreview && (
                  <div className="flex h-14 items-center rounded-md border bg-white px-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logoPreview}
                      alt="Sponsor logo preview"
                      className="max-h-10 max-w-40 object-contain"
                    />
                  </div>
                )}
                <Input
                  id="sponsor-logo"
                  type="file"
                  accept={LOGO_TYPES.join(",")}
                  disabled={uploading}
                  onChange={uploadLogo}
                  className="max-w-xs"
                />
                {uploading && <RuneSpinner size="xs" label="Uploading…" />}
                {form.logoPreview && !uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        logoStorageId: undefined,
                        logoPreview: null,
                      }))
                    }
                  >
                    Remove logo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP or SVG, under 1 MB. A wide logo on a transparent
                background works best; it&apos;s shown about 24px tall in the
                banner.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sponsor-message">Banner message (optional)</Label>
              <Input
                id="sponsor-message"
                maxLength={140}
                placeholder="Go cast something amazing!"
                value={form.message}
                onChange={set("message")}
              />
              <p className="text-xs text-muted-foreground">
                Shown after &ldquo;Duels are free until …, thanks to
                Sponsor.&rdquo; Up to 140 characters.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-start">Starts</Label>
              <Input
                id="sponsor-start"
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={set("startsAt")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-end">Ends</Label>
              <Input
                id="sponsor-end"
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={set("endsAt")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-budget">
                Budget in entries (optional)
              </Label>
              <Input
                id="sponsor-budget"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="No limit"
                value={form.maxEntries}
                onChange={set("maxEntries")}
              />
              <p className="text-xs text-muted-foreground">
                One entry is one player&apos;s seat: a PvP duel uses 2, a
                campaign battle 1. When it runs out, duels cost tokens again.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sponsor-daily">
                Free entries per player per day (optional)
              </Label>
              <Input
                id="sponsor-daily"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="No limit"
                value={form.dailyEntriesPerPlayer}
                onChange={set("dailyEntriesPerPlayer")}
              />
              <p className="text-xs text-muted-foreground">
                Keeps one player from using up the budget. Resets at midnight
                UTC.
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || uploading}>
              {busy ? "Saving…" : editing ? "Save changes" : "Schedule"}
            </Button>
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SponsorshipCard({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const endNow = useMutation(api.sponsorships.endNow);
  const remove = useMutation(api.sponsorships.remove);
  const [error, setError] = useState<string | null>(null);
  const status = STATUS[row.status];
  const editable = row.status !== "ENDED";

  const run = async (
    action: (args: { sponsorshipId: Id<"sponsorships"> }) => Promise<null>,
    confirmText: string,
  ) => {
    if (!window.confirm(confirmText)) return;
    setError(null);
    try {
      await action({ sponsorshipId: row._id });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {row.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.logoUrl}
                  alt=""
                  className="h-6 max-w-28 rounded-sm bg-white object-contain px-1"
                />
              )}
              <h3 className="font-semibold">{row.sponsorName}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatWhen(row.startsAt)} to{" "}
              {formatWhen(row.endedEarlyAt ?? row.endsAt)}
              {row.endedEarlyAt && " (ended early)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            )}
            {(row.status === "RUNNING" || row.status === "BUDGET_SPENT") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  run(
                    endNow,
                    `End ${row.sponsorName}'s sponsorship now? Duels will cost tokens again.`,
                  )
                }
              >
                <Square className="mr-1 h-4 w-4" aria-hidden="true" />
                End now
              </Button>
            )}
            {row.entriesUsed === 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() =>
                  run(remove, `Delete ${row.sponsorName}'s sponsorship?`)
                }
              >
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {(row.message || row.url) && (
          <p className="text-sm">
            {row.message}{" "}
            {row.url && (
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {new URL(row.url).hostname}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Entries covered</dt>
            <dd className="font-semibold">
              {row.entriesUsed}
              {row.maxEntries !== null && ` of ${row.maxEntries}`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Players reached</dt>
            <dd className="font-semibold">{row.players}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Daily limit</dt>
            <dd className="font-semibold">
              {row.dailyEntriesPerPlayer ?? "None"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Budget</dt>
            <dd className="font-semibold">{row.maxEntries ?? "No cap"}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Sponsorships() {
  const rows = useQuery(api.sponsorships.list, {});
  // null: no form open; "new": creating; otherwise the row being edited
  const [formFor, setFormFor] = useState<"new" | Row | null>(null);

  return (
    <>
      <PageHeader
        title="Sponsorships"
        description="Let a sponsor make duels and campaign battles free for a while."
        icon={<HeartHandshake className="h-6 w-6" aria-hidden="true" />}
        actions={
          formFor === null && (
            <Button onClick={() => setFormFor("new")}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              New sponsorship
            </Button>
          )
        }
      />

      <p className="mb-6 text-sm text-muted-foreground">
        While a sponsorship runs, every page shows a thank-you banner, duels it
        pays for show &ldquo;Sponsored by&rdquo;, and players keep their tokens.
        The public pitch is at{" "}
        <Link href="/sponsor" className="text-primary hover:underline">
          /sponsor
        </Link>
        .
      </p>

      {formFor !== null && (
        <SponsorshipForm
          key={formFor === "new" ? "new" : formFor._id}
          editing={formFor === "new" ? null : formFor}
          onDone={() => setFormFor(null)}
        />
      )}

      {rows === undefined ? (
        <div className="flex justify-center py-12">
          <RuneSpinner label="Loading sponsorships…" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No sponsorships yet.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <SponsorshipCard
              key={row._id}
              row={row}
              onEdit={() => setFormFor(row)}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function SponsorshipsPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <SuperAdminOnly>
          <Sponsorships />
        </SuperAdminOnly>
      </div>
    </div>
  );
}
