import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  titleAs?: "h1" | "h2" | "h3";
  className?: string;
}

/** Themed empty state with twinkling stars, used instead of bare "no data" text. */
export function EmptyState({
  title,
  description,
  icon,
  action,
  titleAs: Title = "h2",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border border-dashed border-primary/30 bg-arcane-soft px-6 py-12 text-center",
        className,
      )}
    >
      <Sparkles
        aria-hidden="true"
        className="animate-twinkle absolute left-[18%] top-6 size-4 text-gold"
      />
      <Sparkles
        aria-hidden="true"
        className="animate-twinkle absolute right-[15%] bottom-8 size-5 text-primary [animation-delay:1s]"
      />
      <div className="flex size-14 items-center justify-center rounded-full bg-arcane text-white shadow-lg shadow-primary/30">
        {icon ?? <Sparkles className="size-7" aria-hidden="true" />}
      </div>
      <Title className="font-display text-xl font-bold">{title}</Title>
      {description && (
        <p className="max-w-md text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
