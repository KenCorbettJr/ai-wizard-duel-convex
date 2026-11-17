import { cn } from "@/lib/utils";

interface RuneSpinnerProps {
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  hideLabel?: boolean;
  className?: string;
}

const sizes = {
  xs: "size-4",
  sm: "size-6",
  md: "size-12",
  lg: "size-20",
} as const;

/** Themed loading indicator: a spinning rune ring with a pulsing star. */
export function RuneSpinner({
  label = "Gathering arcane energy…",
  size = "md",
  hideLabel = false,
  className,
}: RuneSpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <span className={cn("relative block", sizes[size])}>
        <svg
          viewBox="0 0 48 48"
          className="animate-rune-spin absolute inset-0 text-primary"
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle
            cx="24"
            cy="24"
            r="15"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1.5"
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="animate-rune-pulse absolute inset-[30%] text-gold"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0l2.4 8.6L24 12l-9.6 3.4L12 24l-2.4-8.6L0 12l9.6-3.4z" />
        </svg>
      </span>
      {size !== "sm" && size !== "xs" && !hideLabel && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
