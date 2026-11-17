import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl items-center p-6">
      <EmptyState
        titleAs="h1"
        className="w-full"
        icon={<Compass className="size-7" aria-hidden="true" />}
        title="Lost in the ethereal plane"
        description="This page has vanished in a puff of smoke. Let's get you back to solid ground."
        action={
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        }
      />
    </div>
  );
}
