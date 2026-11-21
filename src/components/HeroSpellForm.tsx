"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePendingSpell } from "@/lib/pendingSpell";

/**
 * Lets a visitor write their first spell right in the hero. The spell is kept
 * for their first duel, then they go to sign-up. Empty submits just sign up.
 */
export default function HeroSpellForm({
  className = "mx-auto w-full max-w-xl lg:mx-0",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [spell, setSpell] = useState("");

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (spell.trim()) savePendingSpell(spell);
        router.push("/sign-up");
      }}
    >
      <label htmlFor="hero-spell" className="sr-only">
        Write your first spell
      </label>
      <div className="flex flex-col gap-2 rounded-2xl border border-white/20 bg-black/55 p-2 shadow-2xl shadow-black/50 backdrop-blur-md sm:flex-row">
        <input
          id="hero-spell"
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          maxLength={500}
          autoComplete="off"
          placeholder="Type your first spell…"
          className="min-h-12 flex-1 rounded-xl bg-transparent px-4 text-base text-white placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
        />
        <Button type="submit" size="lg" variant="gold" className="text-base">
          <Wand2 aria-hidden="true" />
          Cast It Free
        </Button>
      </div>
    </form>
  );
}
