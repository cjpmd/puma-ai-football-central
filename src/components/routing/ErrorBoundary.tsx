import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Optional name shown in the error message (e.g. "Calendar") */
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this could be sent to an error-tracking service (Sentry, etc.)
    console.error(`[ErrorBoundary] ${this.props.pageName ?? 'Page'} crashed:`, error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">
            {this.props.pageName ? `${this.props.pageName} failed to load` : 'Something went wrong'}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error?.message ?? 'An unexpected error occurred. Try refreshing the page.'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleReset}>
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
