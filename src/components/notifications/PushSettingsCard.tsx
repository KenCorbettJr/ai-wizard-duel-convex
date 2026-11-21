"use client";

import { BellRing, Share } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/** On/off switch for push notifications in this browser. */
export function PushSettingsCard() {
  const { state, busy, enable, disable } = usePushNotifications();

  const toggle = async (on: boolean) => {
    try {
      if (on) {
        const ok = await enable();
        if (ok) toast.success("Notifications are on for this device");
      } else {
        await disable();
      }
    } catch {
      toast.error("Couldn't change notifications. Please try again.");
    }
  };

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-5">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <div className="flex-1">
          <label htmlFor="push-toggle" className="font-medium">
            Push notifications on this device
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            {state === "needs-install" ? (
              <>
                On iPhone and iPad, add AI Wizard Duel to your Home Screen
                first: tap{" "}
                <Share className="inline h-4 w-4" aria-label="Share" />, then
                &ldquo;Add to Home Screen&rdquo;, and open it from there.
              </>
            ) : state === "denied" ? (
              "Notifications are blocked for this site. Allow them in your browser settings, then come back."
            ) : state === "unsupported" ? (
              "This browser doesn't support push notifications. You'll still see them here."
            ) : (
              "We'll let you know when it's your turn to cast and when a duel ends, but only if you're not already watching."
            )}
          </p>
        </div>
        {(state === "on" || state === "off" || state === "loading") && (
          <Switch
            id="push-toggle"
            checked={state === "on"}
            disabled={busy || state === "loading"}
            onCheckedChange={toggle}
          />
        )}
      </CardContent>
    </Card>
  );
}
