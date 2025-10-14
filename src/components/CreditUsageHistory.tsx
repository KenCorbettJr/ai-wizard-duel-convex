"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Gift,
  Coins,
  Crown,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock,
} from "lucide-react";

interface CreditUsageHistoryProps {
  className?: string;
  limit?: number;
  showTitle?: boolean;
}

export function CreditUsageHistory({
  className = "",
  limit = 20,
  showTitle = true,
}: CreditUsageHistoryProps) {
  const { user } = useUser();

  // Get credit history
  const creditHistory = useQuery(
    api.imageCreditService.getImageCreditHistory,
    user?.id ? { userId: user.id, limit } : "skip",
  );

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Sign in to view your credit history
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!creditHistory || creditHistory.length === 0) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Credit History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center py-8">
            No credit activity yet. Start earning credits by watching ads or
            upgrade to Premium!
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTransactionIcon = (type: string, source: string) => {
    if (type === "EARNED") {
      if (source === "AD_REWARD")
        return <Gift className="h-4 w-4 text-green-500" />;
      if (source === "SIGNUP_BONUS")
        return <Gift className="h-4 w-4 text-blue-500" />;
      if (source === "ADMIN_GRANT")
        return <Settings className="h-4 w-4 text-purple-500" />;
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (type === "CONSUMED")
      return <Coins className="h-4 w-4 text-orange-500" />;
    if (type === "GRANTED") {
      if (source === "PREMIUM_GRANT")
        return <Crown className="h-4 w-4 text-purple-500" />;
      return <Gift className="h-4 w-4 text-blue-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "EARNED":
        return "text-green-600 dark:text-green-400";
      case "CONSUMED":
        return "text-orange-600 dark:text-orange-400";
      case "GRANTED":
        return "text-blue-600 dark:text-blue-400";
      case "EXPIRED":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "AD_REWARD":
        return "Ad Reward";
      case "SIGNUP_BONUS":
        return "Welcome Bonus";
      case "PREMIUM_GRANT":
        return "Premium";
      case "ADMIN_GRANT":
        return "Admin Grant";
      default:
        return source.replace("_", " ");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Credit History
            <Badge variant="secondary" className="ml-auto">
              {creditHistory.length} transactions
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {creditHistory.map((transaction, index) => (
            <div
              key={transaction._id}
              className={`flex items-center justify-between p-4 ${
                index !== creditHistory.length - 1
                  ? "border-b border-border"
                  : ""
              } hover:bg-muted/50 transition-colors`}
            >
              <div className="flex items-center gap-3">
                {getTransactionIcon(transaction.type, transaction.source)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {getSourceLabel(transaction.source)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getTransactionColor(transaction.type)}`}
                    >
                      {transaction.type.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(transaction.createdAt)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}
                >
                  {transaction.type === "CONSUMED" ? "-" : "+"}
                  {transaction.amount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {transaction.type === "CONSUMED" ? "used" : "earned"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
