import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // プロップスで渡されたエラーハンドラーを呼び出し
    this.props.onError?.(error, errorInfo);

    // エラー報告（実際のプロジェクトでは外部サービスに送信）
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    // クリーンアップ
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // エラー報告の実装（Sentry、LogRocket等）
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: localStorage.getItem('userId') || 'anonymous'
    };

    console.log('Error Report:', errorReport);
    
    // 実際の実装では外部サービスに送信
    // Sentry.captureException(error, { extra: errorReport });
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= 3) {
      alert('再試行の回数が上限に達しました。ページを再読み込みしてください。');
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
    });

    // 再試行前に少し待機
    const timeout = setTimeout(() => {
      // 必要に応じて状態をリセット
    }, 100);
    
    this.retryTimeouts.push(timeout);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorCategory = (error: Error): string => {
    if (error.message.includes('ChunkLoadError')) return 'ネットワークエラー';
    if (error.message.includes('TypeError')) return 'データエラー';
    if (error.message.includes('ReferenceError')) return 'システムエラー';
    if (error.message.includes('Network')) return 'ネットワークエラー';
    return '不明なエラー';
  };

  private getErrorSolution = (error: Error): string => {
    if (error.message.includes('ChunkLoadError')) {
      return 'ページを再読み込みするか、インターネット接続を確認してください。';
    }
    if (error.message.includes('Network')) {
      return 'インターネット接続を確認し、しばらく時間をおいてから再度お試しください。';
    }
    return 'ページを再読み込みするか、サポートにお問い合わせください。';
  };

  render() {
    if (this.state.hasError) {
      // カスタムフォールバック UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, retryCount } = this.state;
      const errorCategory = error ? this.getErrorCategory(error) : '不明なエラー';
      const errorSolution = error ? this.getErrorSolution(error) : '';

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="glass-dark rounded-2xl border border-red-500/20 p-8 text-center">
              {/* エラーアイコン */}
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertTriangle className="w-10 h-10 text-white" />
              </div>

              {/* エラーメッセージ */}
              <h1 className="text-2xl font-bold text-white mb-4">
                申し訳ございません
              </h1>
              
              <div className="space-y-4 mb-8">
                <p className="text-gray-300">
                  予期しないエラーが発生しました。
                </p>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 font-medium text-sm mb-2">
                    {errorCategory}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {errorSolution}
                  </p>
                </div>

                {retryCount > 0 && (
                  <p className="text-yellow-400 text-sm">
                    再試行回数: {retryCount}/3
                  </p>
                )}
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  disabled={retryCount >= 3}
                  className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-all ${
                    retryCount >= 3
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-cyan-400 hover:bg-cyan-500 text-black'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>再試行</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>再読み込み</span>
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all text-sm"
                  >
                    <Home className="w-4 h-4" />
                    <span>ホーム</span>
                  </button>
                </div>

                <button
                  onClick={() => window.open('mailto:support@ai-creativestock.com', '_blank')}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-white/20 hover:border-white/40 text-gray-300 hover:text-white rounded-lg font-medium transition-all text-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>サポートに連絡</span>
                </button>
              </div>

              {/* エラー詳細（開発環境のみ） */}
              {(import.meta as any).env?.DEV && error && (
                <details className="mt-6 text-left">
                  <summary className="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors">
                    エラー詳細 (開発環境)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-900 rounded-lg text-xs font-mono text-red-300 overflow-auto max-h-40">
                    <div className="mb-2">
                      <strong>Error:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
