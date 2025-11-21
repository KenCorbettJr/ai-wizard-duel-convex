"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error boundary component for user management page
 *
 * Catches errors in the component tree and displays user-friendly error messages
 * with options to retry or return home. Handles authorization errors specially
 * by redirecting to home page.
 */
export class UserManagementErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("User Management Error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Check for authorization errors
    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("not authorized") ||
      error.message.includes("permission")
    ) {
      // Redirect to home after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      const isAuthError =
        this.state.error?.message.includes("Unauthorized") ||
        this.state.error?.message.includes("not authorized") ||
        this.state.error?.message.includes("permission");

      return (
        <div className="min-h-screen bg-linear-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-8 w-8" />
                {isAuthError ? "Access Denied" : "Something Went Wrong"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {isAuthError ? (
                  <>
                    <p className="text-lg">
                      You don&apos;t have permission to access this page.
                    </p>
                    <p className="text-muted-foreground">
                      This area is restricted to administrators only. You will
                      be redirected to the home page shortly.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">
                      An unexpected error occurred while loading the user
                      management interface.
                    </p>
                    <p className="text-muted-foreground">
                      {this.state.error?.message ||
                        "Please try again or contact support if the problem persists."}
                    </p>
                  </>
                )}

                {process.env.NODE_ENV === "development" &&
                  this.state.errorInfo && (
                    <details className="mt-4 p-4 bg-muted rounded-lg text-sm">
                      <summary className="cursor-pointer font-medium mb-2">
                        Error Details (Development Only)
                      </summary>
                      <pre className="overflow-auto text-xs">
                        {this.state.error?.stack}
                      </pre>
                      <pre className="overflow-auto text-xs mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
              </div>

              <div className="flex gap-3 flex-wrap">
                {!isAuthError && (
                  <Button onClick={this.handleReset} variant="default">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
                <Button
                  onClick={this.handleGoHome}
                  variant={isAuthError ? "default" : "outline"}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
