"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Coins,
  Gift,
  Zap,
  Crown,
  UserCog,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Modal component for displaying user credit transaction history
 *
 * Features:
 * - Paginated transaction list
 * - Color-coded transaction type badges
 * - Formatted timestamps and amounts
 * - Admin notes for manual grants
 * - Loading and empty states
 *
 * Usage:
 * ```tsx
 * const [isModalOpen, setIsModalOpen] = useState(false);
 *
 * <CreditHistoryModal
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   userId={user.clerkId}
 *   userName={user.displayName}
 * />
 * ```
 */
interface CreditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const ITEMS_PER_PAGE = 20;

export function CreditHistoryModal({
  isOpen,
  onClose,
  userId,
  userName,
}: CreditHistoryModalProps) {
  const [paginationCursor, setPaginationCursor] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<Array<string | null>>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const creditHistory = useQuery(
    api.adminUsers.getCreditHistory,
    isOpen
      ? {
          userId,
          paginationOpts: {
            numItems: ITEMS_PER_PAGE,
            cursor: paginationCursor,
          },
        }
      : "skip"
  );

  const handleNextPage = () => {
    if (creditHistory && !creditHistory.isDone) {
      const newCursor = creditHistory.continueCursor;
      setPaginationCursor(newCursor);
      setPageHistory([...pageHistory, newCursor]);
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      const previousCursor = pageHistory[currentPageIndex - 1];
      setPaginationCursor(previousCursor);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleClose = () => {
    setPaginationCursor(null);
    setPageHistory([null]);
    setCurrentPageIndex(0);
    onClose();
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: number, type: string): string => {
    const sign = type === "CONSUMED" ? "-" : "+";
    return `${sign}${Math.abs(amount)}`;
  };

  const getTransactionTypeConfig = (
    type: string
  ): {
    label: string;
    className: string;
    icon: React.ReactNode;
  } => {
    switch (type) {
      case "EARNED":
        return {
          label: "Earned",
          className:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
          icon: <Coins className="h-3 w-3" />,
        };
      case "CONSUMED":
        return {
          label: "Consumed",
          className:
            "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
          icon: <Zap className="h-3 w-3" />,
        };
      case "GRANTED":
        return {
          label: "Granted",
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          icon: <Gift className="h-3 w-3" />,
        };
      case "EXPIRED":
        return {
          label: "Expired",
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
          icon: <Clock className="h-3 w-3" />,
        };
      default:
        return {
          label: type,
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800",
          icon: <Coins className="h-3 w-3" />,
        };
    }
  };

  const getSourceConfig = (
    source: string
  ): {
    label: string;
    icon: React.ReactNode;
  } => {
    switch (source) {
      case "SIGNUP_BONUS":
        return {
          label: "Signup Bonus",
          icon: <Gift className="h-3 w-3" />,
        };
      case "AD_REWARD":
        return {
          label: "Ad Reward",
          icon: <Zap className="h-3 w-3" />,
        };
      case "PREMIUM_GRANT":
        return {
          label: "Premium Grant",
          icon: <Crown className="h-3 w-3" />,
        };
      case "ADMIN_GRANT":
        return {
          label: "Admin Grant",
          icon: <UserCog className="h-3 w-3" />,
        };
      default:
        return {
          label: source.replace(/_/g, " "),
          icon: <Coins className="h-3 w-3" />,
        };
    }
  };

  const isLoading = creditHistory === undefined;
  const hasTransactions = creditHistory && creditHistory.page.length > 0;
  const hasNextPage = creditHistory && !creditHistory.isDone;
  const hasPreviousPage = currentPageIndex > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            Credit Transaction History
          </DialogTitle>
          <DialogDescription>
            Transaction history for {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && !hasTransactions && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No transaction history found for this user.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && hasTransactions && (
            <div className="space-y-3">
              {creditHistory.page.map((transaction) => {
                const typeConfig = getTransactionTypeConfig(transaction.type);
                const sourceConfig = getSourceConfig(transaction.source);
                const isAdminGrant = transaction.source === "ADMIN_GRANT";
                const adminNote = isAdminGrant
                  ? (transaction.metadata?.reason as string)
                  : null;
                const grantedBy = isAdminGrant
                  ? (transaction.metadata?.grantedByEmail as string)
                  : null;

                return (
                  <div
                    key={transaction._id}
                    className="rounded-lg border bg-card p-3 sm:p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={typeConfig.className}>
                            {typeConfig.icon}
                            <span className="ml-1">{typeConfig.label}</span>
                          </Badge>
                          <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            {sourceConfig.icon}
                            {sourceConfig.label}
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {formatTimestamp(transaction.createdAt)}
                        </div>

                        {adminNote && (
                          <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs sm:text-sm">
                            <p className="font-medium text-foreground mb-1">
                              Admin Note:
                            </p>
                            <p className="text-muted-foreground wrap-break-word">
                              {adminNote}
                            </p>
                            {grantedBy && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Granted by: {grantedBy}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        className={`text-lg sm:text-xl font-bold shrink-0 ${
                          transaction.type === "CONSUMED"
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        {formatAmount(transaction.amount, transaction.type)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!isLoading && hasTransactions && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Page {currentPageIndex + 1}
              {creditHistory.isDone && " (Last page)"}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!hasPreviousPage}
                className="flex-1 sm:flex-none h-10 sm:h-9"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasNextPage}
                className="flex-1 sm:flex-none h-10 sm:h-9"
              >
                <span className="hidden sm:inline">Next</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
