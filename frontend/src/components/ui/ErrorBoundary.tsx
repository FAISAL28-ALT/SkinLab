import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-card flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-navy">Something went wrong</h1>
          <p className="mt-2 text-sm text-brand-navy/60 max-w-md">
            An unexpected error occurred while loading this page.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full bg-brand-lime px-5 py-2.5 text-sm font-bold text-brand-navy shadow-sm"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="rounded-full border border-brand-border bg-white px-5 py-2.5 text-sm font-bold text-brand-navy shadow-sm hover:bg-gray-50"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
