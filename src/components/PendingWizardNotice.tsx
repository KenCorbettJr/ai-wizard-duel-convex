"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { peekPendingWizard } from "@/lib/pendingWizard";

/**
 * Reassures a visitor on the sign-up/sign-in page that the wizard they
 * started describing on the homepage is saved. Render inside ClientOnly.
 */
export function PendingWizardNotice({ mode }: { mode: "sign-up" | "sign-in" }) {
  const [description] = useState(() => peekPendingWizard());
  if (!description) return null;

  const preview =
    description.length > 120 ? `${description.slice(0, 117)}…` : description;

  return (
    <div
      role="status"
      className="w-full max-w-md rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm shadow-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Wand2 className="size-4 shrink-0 text-gold" aria-hidden="true" />
        Your wizard is saved
      </p>
      <p className="mt-1 italic text-muted-foreground">&ldquo;{preview}&rdquo;</p>
      <p className="mt-2 text-foreground">
        {mode === "sign-up"
          ? "Create your free account and we'll take you straight back to finish them."
          : "Sign in and we'll take you straight back to finish them."}
      </p>
    </div>
  );
}
