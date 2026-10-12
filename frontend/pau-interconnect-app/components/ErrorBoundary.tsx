"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { Button, Typography, Stack } from "./ui";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error | undefined, reset: () => void) => ReactNode);
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    if (this.props.onReset) {
      this.props.onReset();
      this.setState({ hasError: false, error: undefined });
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.handleReload);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-background text-fg flex items-center justify-center p-6 text-center"
        >
          <div className="max-w-md w-full bg-surface rounded-3xl p-8 md:p-10 shadow-2xl border border-border animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-danger-subtle rounded-3xl flex items-center justify-center text-danger mx-auto mb-6 shadow-sm">
              <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" />
            </div>

            <Typography variant="h3" weight="bold" className="mb-3">
              Something went wrong
            </Typography>

            <Typography variant="body2" color="muted" className="mb-8 leading-relaxed">
              {this.state.error?.message ||
                "An unexpected technical error occurred while rendering this page."}
            </Typography>

            <Stack spacing={3}>
              <Button
                onClick={this.handleReload}
                className="w-full h-12 md:h-14 rounded-2xl shadow-sm"
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full h-12 md:h-14 rounded-2xl"
                leftIcon={<Home className="w-4 h-4" />}
              >
                Back to Home
              </Button>
            </Stack>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
