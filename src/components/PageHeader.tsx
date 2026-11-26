import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Extra classes for the description, e.g. to hide it on small screens. */
  descriptionClassName?: string;
  /** Drop the decorative rule on phones, where height is precious. */
  compactOnMobile?: boolean;
}

/** Standard page heading used across every section for a consistent look. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
  descriptionClassName,
  compactOnMobile = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-arcane text-white shadow-md shadow-primary/30">
            {icon}
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-1 max-w-2xl text-muted-foreground",
                descriptionClassName,
              )}
            >
              {description}
            </p>
          )}
          <div
            aria-hidden="true"
            className={cn(
              "mt-3 h-0.5 w-24 rounded-full bg-linear-to-r from-gold to-transparent",
              compactOnMobile && "hidden sm:block",
            )}
          />
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
