"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl items-center p-6">
      <EmptyState
        titleAs="h1"
        className="w-full"
        icon={<WandSparkles className="size-7" aria-hidden="true" />}
        title="The spell fizzled"
        description="Something went wrong while weaving this page. Try casting it again."
        action={<Button onClick={reset}>Cast again</Button>}
      />
    </div>
  );
}
