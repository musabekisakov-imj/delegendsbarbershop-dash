import { Component, type ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { reportError } from '../../lib/report-error';

// Swap this function for Sentry.captureException (or similar) when wired up.
// Keeping it as a single pluggable hook so the error boundary stays clean.
type ErrorReporter = (error: Error, info: React.ErrorInfo) => void;

let reporter: ErrorReporter = (error, info) => {
  reportError(error, { componentStack: info.componentStack });
};

export function setErrorReporter(fn: ErrorReporter) {
  reporter = fn;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reporter(error, errorInfo);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60 mb-4">
            <ExclamationTriangleIcon className="h-7 w-7 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            An unexpected error occurred while rendering this page. You can try reloading the section below or return to the dashboard.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mb-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.assign('/')}>
              Go to dashboard
            </Button>
            <Button size="sm" onClick={this.reset}>
              <ArrowPathIcon className="mr-1.5 h-4 w-4" />
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
