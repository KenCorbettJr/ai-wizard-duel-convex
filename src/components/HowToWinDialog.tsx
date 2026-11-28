"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HowToWin } from "@/components/HowToWin";

/** Opens the "How to win" rules from anywhere. `children` is the trigger. */
export function HowToWinDialog({ children }: { children: ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            How to Win a Duel
          </DialogTitle>
          <DialogDescription className="sr-only">
            How health decides the winner.
          </DialogDescription>
        </DialogHeader>
        <HowToWin />
      </DialogContent>
    </Dialog>
  );
}
