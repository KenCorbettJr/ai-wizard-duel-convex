import { RuneSpinner } from "@/components/ui/rune-spinner";

export default function Loading() {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
      <RuneSpinner size="lg" />
    </div>
  );
}
