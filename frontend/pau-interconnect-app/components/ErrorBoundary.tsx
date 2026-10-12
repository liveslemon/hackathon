"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { Button, Typography, Stack } from "./ui";

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
          className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center"
        >
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-8">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <Typography variant="h3" weight="bold" className="mb-4 text-slate-800 dark:text-slate-100">
              Something went wrong
            </Typography>

            <Typography variant="body2" color="muted" className="mb-8">
              {this.state.error?.message ||
                "An unexpected technical error occurred while rendering this page."}
            </Typography>

            <Stack spacing={3}>
              <Button
                onClick={this.handleReload}
                className="w-full h-12 md:h-14 rounded-2xl shadow-lg shadow-indigo-500/10"
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                onClick={this.handleGoHome}
                className="w-full h-12 md:h-14 rounded-2xl text-slate-500 dark:text-slate-400"
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
