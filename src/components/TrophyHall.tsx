"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ConvexImage } from "@/components/ConvexImage";
import { cn } from "@/lib/utils";

interface TrophyHallProps {
  wizardId: Id<"wizards">;
}

/**
 * The wizards this one has beaten, as a scrollable row of captioned
 * portraits. Renders nothing until there's at least one victory.
 */
export function TrophyHall({ wizardId }: TrophyHallProps) {
  const defeatedWizards = useQuery(api.wizards.getDefeatedWizards, {
    wizardId,
  });

  if (!defeatedWizards || defeatedWizards.length === 0) return null;

  return (
    <section aria-labelledby="trophy-hall-heading">
      <h2
        id="trophy-hall-heading"
        className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        <Trophy className="h-4 w-4 text-gold" aria-hidden />
        Defeated
        <span className="font-sans font-normal normal-case tracking-normal">
          ({defeatedWizards.length})
        </span>
      </h2>
      <ul
        className={cn(
          "-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0",
          defeatedWizards.length > 4 &&
            "[mask-image:linear-gradient(to_right,black_85%,transparent)]",
        )}
      >
        {defeatedWizards.map((wizard) => (
          <li key={wizard._id} className="w-20 shrink-0">
            <Link
              href={`/wizards/${wizard._id}`}
              className="group block text-center"
              title={`Defeated ${wizard.name} on ${new Date(wizard.defeatedAt).toLocaleDateString()}`}
            >
              <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-full border-2 border-gold/50 bg-muted transition-colors group-hover:border-gold">
                {wizard.illustration ? (
                  <ConvexImage
                    storageId={wizard.illustration}
                    alt=""
                    width={112}
                    height={112}
                    sizes="56px"
                    className="h-full w-full rounded-none object-cover"
                  />
                ) : wizard.illustrationURL ? (
                  <Image
                    src={wizard.illustrationURL}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Zap className="h-5 w-5 text-warning" aria-hidden />
                  </div>
                )}
              </div>
              <span className="mt-1 line-clamp-2 block text-xs leading-tight text-muted-foreground group-hover:text-foreground">
                {wizard.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
