"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CREATE_WIZARD_SIGN_UP_URL,
  savePendingWizard,
} from "@/lib/pendingWizard";

/**
 * Lets a visitor describe their wizard right on the homepage. The description
 * is kept through sign-up and fills in the create-wizard form afterwards.
 * Empty submits just sign up.
 */
export default function HeroWizardForm({
  id = "hero-wizard",
  className = "mx-auto w-full max-w-xl lg:mx-0",
}: {
  id?: string;
  className?: string;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (description.trim()) savePendingWizard(description);
        router.push(CREATE_WIZARD_SIGN_UP_URL);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Describe your wizard
      </label>
      <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-black/55 p-2 shadow-2xl shadow-black/50 backdrop-blur-md sm:flex-row">
        <input
          id={id}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          autoComplete="off"
          placeholder="Describe your wizard…"
          className="min-h-12 flex-1 rounded-xl bg-transparent px-4 text-base text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
        />
        <Button type="submit" size="lg" variant="gold" className="text-base">
          <Wand2 aria-hidden="true" />
          Create My Wizard
        </Button>
      </div>
    </form>
  );
}
