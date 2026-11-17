"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, UserPlus } from "lucide-react";

interface ProfileCompletionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  isSignInPrompt?: boolean;
}

export function ProfileCompletionPrompt({
  open,
  onOpenChange,
  title,
  message,
  actionLabel,
  onAction,
  isSignInPrompt = false,
}: ProfileCompletionPromptProps) {
  const handleAction = () => {
    onAction();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {isSignInPrompt ? (
              <UserPlus className="h-6 w-6 text-info" />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">{message}</DialogDescription>
        </DialogHeader>

        {!isSignInPrompt && (
          <div className="bg-primary/8 border border-primary/30 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-primary mb-2">
              Why complete your profile?
            </h4>
            <ul className="text-sm text-primary space-y-1">
              <li>• Get a unique handle like @{"{username}"}</li>
              <li>• Let others discover your wizards</li>
              <li>• Build your reputation in the community</li>
              <li>• Share your achievements easily</li>
            </ul>
            <div className="mt-3 p-2 bg-success/15 rounded border border-success/40">
              <p className="text-xs text-success font-medium">
                🎁 Free setup • Takes less than 2 minutes • Join thousands of
                wizards!
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleAction}
            className={isSignInPrompt ? "flex-1" : "flex-1"}
          >
            {actionLabel}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
