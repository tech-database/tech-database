import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md space-y-4">
            <div className="bg-red-100 text-red-800 p-3 rounded-full inline-flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.007H12v-.007z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">哎呀，出了点问题</h1>
            <p className="text-gray-600">
              应用程序遇到了错误，但不要担心，我们已经记录下来了。
            </p>
            <div className="bg-gray-100 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700 font-mono truncate">
                {this.state.error?.message}
              </p>
            </div>
            <div className="space-x-3">
              <Button onClick={this.handleReset} className="px-6">
                重新加载
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/')}
                className="px-6"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;