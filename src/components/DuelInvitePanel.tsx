"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const noSubscribe = () => () => {};

interface DuelInvitePanelProps {
  shortcode: string;
  /** Used in the native share message, e.g. "Ember challenges you…" */
  wizardName?: string;
}

/**
 * Everything a friend needs to join a waiting duel: a QR code to scan, the
 * short code to read out, and the link to copy or share.
 */
export function DuelInvitePanel({
  shortcode,
  wizardName,
}: DuelInvitePanelProps) {
  // The origin isn't known during server rendering
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  const url = origin ? `${origin}/join/${shortcode}` : "";
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Invite link copied");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Select it and copy manually.");
    }
  };

  const share = async () => {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({
        title: "Wizard Duel Challenge",
        text: `${wizardName ?? "A wizard"} challenges you to a magical duel!`,
        url,
      });
    } catch (error) {
      // Closing the share sheet isn't a failure
      if (error instanceof DOMException && error.name === "AbortError") return;
      copyLink();
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="shrink-0 rounded-xl bg-white p-3 shadow-md">
        {url ? (
          <QRCodeSVG
            value={url}
            size={168}
            level="M"
            bgColor="#ffffff"
            fgColor="#1a1033"
            title="Scan to join this duel"
          />
        ) : (
          <div className="size-[168px]" aria-hidden="true" />
        )}
      </div>

      <div className="w-full min-w-0 space-y-3 text-center sm:text-left">
        <div>
          <p className="text-sm text-muted-foreground">
            Have your opponent scan the code, or enter
          </p>
          <p
            className="font-mono text-3xl font-bold tracking-[0.3em] text-primary"
            aria-label={`Duel code ${shortcode.split("").join(" ")}`}
          >
            {shortcode}
          </p>
          <p className="text-sm text-muted-foreground">
            at <span className="font-medium text-foreground">Join by Code</span>
            . The duel starts as soon as they join, and this page will take you
            there.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={share} className="flex-1">
            <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Share link
          </Button>
          <Button variant="outline" onClick={copyLink} className="flex-1">
            {copied ? (
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
