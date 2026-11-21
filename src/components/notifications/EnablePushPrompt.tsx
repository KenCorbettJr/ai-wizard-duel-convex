"use client";

import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "push-prompt-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Inline nudge to turn on push, shown in a duel the player is in. Only
 * appears when push is available but off here, and stays gone once dismissed.
 */
export function EnablePushPrompt({ className }: { className?: string }) {
  const { state, busy, enable } = usePushNotifications();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (state !== "off" || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: it just comes back next visit.
    }
  };

  const turnOn = async () => {
    try {
      if (await enable()) toast.success("We'll ping you when it's your turn");
    } catch {
      toast.error("Couldn't turn on notifications. Please try again.");
    }
  };

  return (
    <div
      className={cn(
        "mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4",
        className,
      )}
    >
      <BellRing className="h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
      <p className="flex-1 text-sm">
        Step away without missing your turn. Get a notification when it&rsquo;s
        time to cast.
      </p>
      <Button size="sm" onClick={turnOn} disabled={busy}>
        Notify me
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
