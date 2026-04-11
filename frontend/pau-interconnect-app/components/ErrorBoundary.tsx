"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { Button, Typography, Stack } from "./ui";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class GlobalErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-8">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <Typography variant="h3" weight="bold" className="mb-4 text-slate-800">
              Something went wrong
            </Typography>
            
            <Typography variant="body2" color="muted" className="mb-10">
              {this.state.error?.message || "An unexpected technical error occurred while rendering this page."}
            </Typography>
            
            <Stack spacing={3}>
              <Button onClick={this.handleReload} fullWidth className="h-14 rounded-2xl shadow-lg shadow-indigo-100">
                Reload Page
              </Button>
              <Button variant="ghost" onClick={this.handleGoHome} fullWidth className="h-14 rounded-2xl text-slate-500">
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
