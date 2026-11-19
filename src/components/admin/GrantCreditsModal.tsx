"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Coins, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RuneSpinner } from "@/components/ui/rune-spinner";

/**
 * Modal component for granting image credits to users
 *
 * Features:
 * - Input validation (positive integers only)
 * - Required reason/note field for audit trail
 * - Real-time balance preview
 * - Success/error feedback with toast notifications
 * - Loading states during submission
 *
 * Usage:
 * ```tsx
 * const [isModalOpen, setIsModalOpen] = useState(false);
 *
 * <GrantCreditsModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   userId={user.clerkId}
 *   userName={user.displayName}
 *   currentBalance={user.imageCredits}
 *   onSuccess={() => {
 *     // Refresh user data
 *     refetchUsers();
 *   }}
 * />
 * ```
 */
interface GrantCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentBalance: number;
  onSuccess: () => void;
}

export function GrantCreditsModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentBalance,
  onSuccess,
}: GrantCreditsModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const grantCredits = useMutation(api.adminUsers.grantImageCredits);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow positive integers
    if (value === "" || /^\d+$/.test(value)) {
      setAmount(value);
      setError("");
    }
  };

  const validateForm = (): boolean => {
    if (!amount || amount === "0") {
      setError("Please enter a valid token amount");
      return false;
    }

    const numAmount = parseInt(amount, 10);
    if (numAmount <= 0 || !Number.isInteger(numAmount)) {
      setError("Token amount must be a positive integer");
      return false;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for this token grant");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await grantCredits({
        targetUserId: userId,
        amount: parseInt(amount, 10),
        reason: reason.trim(),
      });

      if (result.success) {
        setSuccess(true);
        toast.success("Tokens granted successfully!", {
          description: `${userName} now has ${result.newBalance} tokens`,
        });
        // Wait a moment to show success message
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to grant tokens";
      setError(errorMessage);
      toast.error("Failed to grant tokens", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount("");
      setReason("");
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  const previewBalance = amount
    ? currentBalance + parseInt(amount, 10)
    : currentBalance;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-gold" />
            Grant Tokens
          </DialogTitle>
          <DialogDescription>
            Add tokens to {userName}&apos;s account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Balance Display */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Current Balance
                  </p>
                  <p className="text-2xl font-bold flex items-center gap-2">
                    <Coins className="h-5 w-5 text-gold" />
                    {currentBalance}
                  </p>
                </div>
                {amount && (
                  <div className="sm:text-right">
                    <p className="text-sm text-muted-foreground">New Balance</p>
                    <p className="text-2xl font-bold text-success flex items-center gap-2 sm:justify-end">
                      <Coins className="h-5 w-5 text-gold" />
                      {previewBalance}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Token Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="Enter amount (e.g., 100)"
                value={amount}
                onChange={handleAmountChange}
                disabled={isSubmitting || success}
                aria-invalid={!!error && !amount}
                autoFocus
                className="text-base sm:text-sm h-11 sm:h-10"
              />
              <p className="text-xs text-muted-foreground">
                Enter a positive integer value
              </p>
            </div>

            {/* Reason Textarea */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason / Note <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., Customer support request, promotional token, compensation for issue..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError("");
                }}
                disabled={isSubmitting || success}
                aria-invalid={!!error && !reason.trim()}
                rows={3}
                className="resize-none text-base sm:text-sm min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                This will be recorded in the transaction history
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="border-success bg-success/10">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <AlertDescription className="text-success">
                  Tokens granted successfully!
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting || success}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || success || !amount || !reason.trim()}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isSubmitting ? (
                <>
                  <RuneSpinner size="xs" label="Working…" className="mr-2" />
                  Granting...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Granted
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-2" />
                  Grant Tokens
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
