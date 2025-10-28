import { auditLogger } from './auditLogger';

// エラータイプの定義
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  DATABASE = 'database',
  FILE_UPLOAD = 'file_upload',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  UNKNOWN = 'unknown'
}

// エラーレベルの定義
export enum ErrorLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// カスタムエラークラス
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly level: ErrorLevel;
  public readonly code: string;
  public readonly userId?: string;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    level: ErrorLevel = ErrorLevel.MEDIUM,
    code?: string,
    userId?: string,
    context?: Record<string, any>,
    retryable = false
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.level = level;
    this.code = code || type.toUpperCase();
    this.userId = userId;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.retryable = retryable;

    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// エラーハンドラーの設定
interface ErrorHandlerConfig {
  enableConsoleLogging: boolean;
  enableAuditLogging: boolean;
  enableUserNotification: boolean;
  enableRetry: boolean;
  maxRetryAttempts: number;
  sentryDsn?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private retryAttempts: Map<string, number> = new Map();

  private constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableConsoleLogging: true,
      enableAuditLogging: true,
      enableUserNotification: true,
      enableRetry: true,
      maxRetryAttempts: 3,
      ...config
    };

    this.setupGlobalErrorHandlers();
  }

  public static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  // グローバルエラーハンドラーの設定
  private setupGlobalErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // 未処理のPromise拒否
      window.addEventListener('unhandledrejection', (event) => {
        const error = new AppError(
          `未処理のPromise拒否: ${event.reason}`,
          ErrorType.UNKNOWN,
          ErrorLevel.HIGH,
          'UNHANDLED_PROMISE_REJECTION'
        );
        this.handleError(error);
        event.preventDefault();
      });

      // JavaScript エラー
      window.addEventListener('error', (event) => {
        const error = new AppError(
          `JavaScript エラー: ${event.message}`,
          ErrorType.UNKNOWN,
          ErrorLevel.MEDIUM,
          'JAVASCRIPT_ERROR',
          undefined,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        );
        this.handleError(error);
      });
    }
  }

  // エラーハンドリングの中核メソッド
  public async handleError(error: Error | AppError, userId?: string, additionalContext?: Record<string, any>): Promise<void> {
    let appError: AppError;

    // AppErrorでない場合は変換
    if (!(error instanceof AppError)) {
      appError = this.convertToAppError(error, userId, additionalContext);
    } else {
      appError = error;
      if (userId && !appError.userId) {
        appError = new AppError(
          appError.message,
          appError.type,
          appError.level,
          appError.code,
          userId,
          { ...appError.context, ...additionalContext },
          appError.retryable
        );
      }
    }

    // コンソールログ
    if (this.config.enableConsoleLogging) {
      this.logToConsole(appError);
    }

    // 監査ログ
    if (this.config.enableAuditLogging) {
      await this.logToAuditSystem(appError);
    }

    // ユーザー通知
    if (this.config.enableUserNotification) {
      this.notifyUser(appError);
    }

    // 外部サービス通知（Sentry等）
    if (this.config.sentryDsn) {
      this.reportToExternalService(appError);
    }

    // リトライ処理
    if (this.config.enableRetry && appError.retryable) {
      await this.handleRetry(appError);
    }
  }

  // エラーをAppErrorに変換
  private convertToAppError(error: Error, userId?: string, context?: Record<string, any>): AppError {
    let type = ErrorType.UNKNOWN;
    let level = ErrorLevel.MEDIUM;
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    // エラーメッセージやタイプから分類
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      type = ErrorType.NETWORK;
      retryable = true;
    } else if (message.includes('auth') || message.includes('unauthorized')) {
      type = ErrorType.AUTHENTICATION;
      level = ErrorLevel.HIGH;
    } else if (message.includes('permission') || message.includes('forbidden')) {
      type = ErrorType.AUTHORIZATION;
      level = ErrorLevel.HIGH;
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = ErrorType.VALIDATION;
      level = ErrorLevel.LOW;
    } else if (message.includes('database') || message.includes('sql')) {
      type = ErrorType.DATABASE;
      level = ErrorLevel.HIGH;
      retryable = true;
    } else if (message.includes('rate limit') || message.includes('too many')) {
      type = ErrorType.RATE_LIMIT;
      level = ErrorLevel.MEDIUM;
    } else if (message.includes('security') || message.includes('csrf') || message.includes('xss')) {
      type = ErrorType.SECURITY;
      level = ErrorLevel.CRITICAL;
    }

    return new AppError(
      error.message,
      type,
      level,
      code,
      userId,
      {
        originalError: error.name,
        stack: error.stack,
        ...context
      },
      retryable
    );
  }

  // コンソールログ出力
  private logToConsole(error: AppError): void {
    const logLevel = error.level === ErrorLevel.CRITICAL ? 'error' :
                    error.level === ErrorLevel.HIGH ? 'warn' : 'info';

    console[logLevel](`[ERROR] ${error.type.toUpperCase()}: ${error.message}`, {
      code: error.code,
      level: error.level,
      userId: error.userId,
      timestamp: error.timestamp,
      context: error.context,
      stack: error.stack
    });
  }

  // 監査ログシステムに記録
  private async logToAuditSystem(error: AppError): Promise<void> {
    try {
      const context = {
        userId: error.userId,
        additional: {
          error_code: error.code,
          error_level: error.level,
          error_type: error.type,
          retryable: error.retryable,
          timestamp: error.timestamp,
          ...error.context
        }
      };

      auditLogger.logError(error, context, 'error_occurred', 'error_handling');
    } catch (auditError) {
      console.error('監査ログ記録エラー:', auditError);
    }
  }

  // ユーザーへの通知
  private notifyUser(error: AppError): void {
    // 開発環境では通知を無効化
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      console.log(`[DEV] エラー通知を無効化: ${error.message}`);
      return;
    }

    let userMessage = 'システムエラーが発生しました。しばらく時間をおいて再度お試しください。';

    switch (error.type) {
      case ErrorType.AUTHENTICATION:
        userMessage = 'ログインの有効期限が切れました。再度ログインしてください。';
        break;
      case ErrorType.AUTHORIZATION:
        userMessage = 'この操作を実行する権限がありません。';
        break;
      case ErrorType.VALIDATION:
        userMessage = '入力内容に誤りがあります。確認して再度お試しください。';
        break;
      case ErrorType.NETWORK:
        userMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
        break;
      case ErrorType.FILE_UPLOAD:
        userMessage = 'ファイルのアップロードに失敗しました。ファイル形式やサイズを確認してください。';
        break;
      case ErrorType.RATE_LIMIT:
        userMessage = 'リクエストが多すぎます。しばらく時間をおいて再度お試しください。';
        break;
    }

    // ユーザーフレンドリーなエラー表示
    if (error.level === ErrorLevel.LOW) {
      console.info(userMessage);
    } else {
      alert(userMessage);
    }
  }

  // 外部サービスへの報告
  private reportToExternalService(error: AppError): void {
    // Sentry、Bugsnag、DataDog等への報告
    if (this.config.sentryDsn && typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          error_type: error.type,
          error_level: error.level,
          error_code: error.code
        },
        user: error.userId ? { id: error.userId } : undefined,
        extra: error.context
      });
    }
  }

  // リトライ処理
  private async handleRetry(error: AppError): Promise<void> {
    if (!error.retryable) return;

    const retryKey = `${error.code}_${error.userId || 'anonymous'}`;
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;

    if (currentAttempts >= this.config.maxRetryAttempts) {
      console.warn(`最大リトライ回数に達しました: ${error.message}`);
      this.retryAttempts.delete(retryKey);
      return;
    }

    this.retryAttempts.set(retryKey, currentAttempts + 1);

    // 指数バックオフでリトライ
    const delay = Math.pow(2, currentAttempts) * 1000;
    setTimeout(() => {
      console.log(`リトライ中 (${currentAttempts + 1}/${this.config.maxRetryAttempts}): ${error.message}`);
      // ここで実際のリトライロジックを実装
    }, delay);
  }

  // エラー統計の取得
  public getErrorStatistics(timeRange: 'hour' | 'day' | 'week' = 'day'): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByLevel: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
  } {
    // 実装は監査ログシステムと連携
    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByLevel: {},
      topErrors: []
    };
  }

  // 設定の更新
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // リトライカウンターのクリア
  public clearRetryAttempts(): void {
    this.retryAttempts.clear();
  }
}

// グローバルエラーハンドラーのインスタンス
export const globalErrorHandler = ErrorHandler.getInstance();

// ヘルパー関数
export const handleAsyncError = async (
  operation: () => Promise<any>,
  errorType: ErrorType = ErrorType.UNKNOWN,
  userId?: string,
  context?: Record<string, any>
): Promise<any> => {
  try {
    return await operation();
  } catch (error) {
    const appError = new AppError(
      error instanceof Error ? error.message : String(error),
      errorType,
      ErrorLevel.MEDIUM,
      undefined,
      userId,
      context,
      true
    );
    await globalErrorHandler.handleError(appError);
    throw appError;
  }
};

// React エラーバウンダリ用のエラーハンドラー
export const handleReactError = (error: Error, errorInfo: any, userId?: string) => {
  const appError = new AppError(
    error.message,
    ErrorType.UNKNOWN,
    ErrorLevel.HIGH,
    'REACT_ERROR',
    userId,
    {
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    }
  );
  globalErrorHandler.handleError(appError);
};