"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** "Try again" for a round's narration or illustration after it failed. */
export function MediaRetryButton({
  onRetry,
  label = "Try again",
}: {
  onRetry: () => Promise<unknown>;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onRetry();
        } catch (error) {
          console.error("Retry failed:", error);
          toast.error("Couldn't retry right now. Please try again shortly.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <RotateCw
        className={`h-4 w-4 mr-1 ${busy ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      {label}
    </Button>
  );
}
