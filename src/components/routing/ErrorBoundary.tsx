import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  /** Screen name shown in the error message and Sentry context */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, eventId: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const screen = this.props.pageName ?? 'Unknown screen';
    console.error(`[ErrorBoundary] ${screen} crashed:`, error, info);

    const eventId = Sentry.captureException(error, {
      extra: {
        screen,
        componentStack: info.componentStack,
      },
    });
    this.setState({ eventId });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, eventId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isNetworkError =
      this.state.error?.message?.toLowerCase().includes('network') ||
      this.state.error?.message?.toLowerCase().includes('fetch');

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center">
        {isNetworkError ? (
          <Wifi className="h-12 w-12 text-muted-foreground" />
        ) : (
          <AlertTriangle className="h-12 w-12 text-destructive" />
        )}

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {isNetworkError
              ? 'Connection lost'
              : this.props.pageName
              ? `${this.props.pageName} failed to load`
              : 'Something went wrong'}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isNetworkError
              ? 'Check your connection and tap Retry. Cached data may still be available.'
              : (this.state.error?.message ?? 'An unexpected error occurred.')}
          </p>
          {this.state.eventId && (
            <p className="text-xs text-muted-foreground/60">
              Ref: {this.state.eventId.slice(0, 8)}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={this.handleReset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button onClick={() => window.location.reload()}>Reload app</Button>
        </div>
      </div>
    );
  }
}
