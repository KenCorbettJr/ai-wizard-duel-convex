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
              <UserPlus className="h-6 w-6 text-blue-600" />
            ) : (
              <User className="h-6 w-6 text-purple-600" />
            )}
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">{message}</DialogDescription>
        </DialogHeader>

        {!isSignInPrompt && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
              Why complete your profile?
            </h4>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <li>• Get a unique handle like @{"{username}"}</li>
              <li>• Let others discover your wizards</li>
              <li>• Build your reputation in the community</li>
              <li>• Share your achievements easily</li>
            </ul>
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                🎁 Free setup • Takes less than 2 minutes • Join thousands of
                wizards!
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleAction}
            className={
              isSignInPrompt
                ? "flex-1 bg-blue-600 hover:bg-blue-700"
                : "flex-1 bg-purple-600 hover:bg-purple-700"
            }
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
