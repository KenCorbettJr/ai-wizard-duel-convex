"use client";

import React, { Component, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CampaignErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Campaign Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-6 w-6" />
                  Campaign Error
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium mb-2">
                    Something went wrong with the campaign system.
                  </p>
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {this.state.error?.message ||
                      "An unexpected error occurred"}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => {
                      this.setState({ hasError: false, error: undefined });
                      window.location.reload();
                    }}
                    variant="outline"
                    className="border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>

                  <Button asChild variant="outline">
                    <Link href="/">
                      <Home className="h-4 w-4 mr-2" />
                      Return Home
                    </Link>
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground pt-4 border-t border-red-200 dark:border-red-800">
                  <p>
                    If this problem persists, please try refreshing the page or
                    contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for campaign error handling
export function useCampaignErrorHandler() {
  const handleError = (error: Error, context: string) => {
    console.error(`Campaign Error in ${context}:`, error);

    // You could integrate with error reporting service here
    // e.g., Sentry, LogRocket, etc.

    return {
      message: error.message || "An unexpected error occurred",
      context,
      timestamp: new Date().toISOString(),
    };
  };

  return { handleError };
}
