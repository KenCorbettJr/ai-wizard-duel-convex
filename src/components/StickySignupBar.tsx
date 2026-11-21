"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CREATE_WIZARD_SIGN_UP_URL } from "@/lib/pendingWizard";

/**
 * Phone-only sign-up bar that slides in once the visitor has scrolled past the
 * hero, so there's always a way to start without scrolling back up.
 */
export default function StickySignupBar({
  freeDuels,
}: {
  freeDuels: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const finalCta = document.getElementById("final-cta");
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.9;
      const atFinalCta =
        !!finalCta &&
        finalCta.getBoundingClientRect().top < window.innerHeight;
      setVisible(pastHero && !atFinalCta);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[oklch(0.15_0.04_285)]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 md:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <p className="flex-1 text-sm leading-tight text-white/80">
          <b className="text-white">{freeDuels} free duels</b>
          <br />
          No card needed
        </p>
        <Button
          asChild
          variant="gold"
          className="shrink-0"
          tabIndex={visible ? 0 : -1}
        >
          <Link href={CREATE_WIZARD_SIGN_UP_URL}>
            <Wand2 aria-hidden="true" />
            Create My Wizard
          </Link>
        </Button>
      </div>
    </div>
  );
}
