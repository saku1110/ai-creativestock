// Minimal, robust error handler for client code

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

export enum ErrorLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class AppError extends Error {
  readonly type: ErrorType;
  readonly level: ErrorLevel;
  readonly code: string;
  readonly userId?: string;
  readonly context?: Record<string, any>;
  readonly timestamp: string;
  readonly retryable: boolean;

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
  }
}

type ErrorHandlerConfig = {
  enableConsoleLogging: boolean;
  enableUserNotification: boolean;
  enableRetry: boolean;
  maxRetryAttempts: number;
  sentryDsn?: string;
};

export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private retryAttempts: Map<string, number> = new Map();

  private constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      enableConsoleLogging: true,
      enableUserNotification: true,
      enableRetry: true,
      maxRetryAttempts: 3,
      ...config
    } as ErrorHandlerConfig;
    this.setupGlobalErrorHandlers();
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) ErrorHandler.instance = new ErrorHandler(config);
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('unhandledrejection', (event) => {
      const reason: any = (event as any).reason;
      const name = reason?.name || '';
      const msg: string = typeof reason === 'string' ? reason : (reason?.message || '');
      if (name === 'NotSupportedError' || /notsupportederror|no supported sources/i.test(msg)) {
        event.preventDefault();
        return;
      }
      const err = new AppError(`Unhandled promise rejection: ${msg || String(reason)}`, ErrorType.UNKNOWN, ErrorLevel.HIGH, 'UNHANDLED_PROMISE_REJECTION');
      void this.handleError(err);
      event.preventDefault();
    });

    window.addEventListener('error', (event: ErrorEvent) => {
      const msg = String(event.message || '');
      if (/no supported sources/i.test(msg)) return;
      const err = new AppError(`JavaScript error: ${msg}`, ErrorType.UNKNOWN, ErrorLevel.MEDIUM, 'JAVASCRIPT_ERROR', undefined, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      void this.handleError(err);
    });
  }

  async handleError(error: Error | AppError, userId?: string, context?: Record<string, any>): Promise<void> {
    const appError = error instanceof AppError
      ? error
      : this.convertToAppError(error, userId, context);

    if (this.config.enableConsoleLogging) this.logToConsole(appError);

    if (this.config.enableRetry && appError.retryable) {
      await this.handleRetry(appError);
    }
  }

  private convertToAppError(error: Error, userId?: string, context?: Record<string, any>): AppError {
    return new AppError(error.message, ErrorType.UNKNOWN, ErrorLevel.MEDIUM, 'UNKNOWN_ERROR', userId, {
      originalError: error.name,
      stack: error.stack,
      ...context
    });
  }

  private logToConsole(error: AppError): void {
    const level = error.level === ErrorLevel.CRITICAL ? 'error' : error.level === ErrorLevel.HIGH ? 'warn' : 'info';
    (console as any)[level](`[ERROR] ${error.type.toUpperCase()}: ${error.message}`, {
      code: error.code,
      level: error.level,
      userId: error.userId,
      timestamp: error.timestamp,
      context: error.context
    });
  }

  private async handleRetry(error: AppError): Promise<void> {
    const key = `${error.code}:${error.message}`;
    const attempts = (this.retryAttempts.get(key) || 0) + 1;
    this.retryAttempts.set(key, attempts);
    if (attempts > this.config.maxRetryAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
    await new Promise((r) => setTimeout(r, delay));
  }

  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig } as ErrorHandlerConfig;
  }

  public clearRetryAttempts(): void {
    this.retryAttempts.clear();
  }
}

export const globalErrorHandler = ErrorHandler.getInstance();

export const handleAsyncError = async <T>(operation: () => Promise<T>, errorType: ErrorType = ErrorType.UNKNOWN, userId?: string, context?: Record<string, any>): Promise<T> => {
  try {
    return await operation();
  } catch (e: any) {
    const appError = new AppError(e instanceof Error ? e.message : String(e), errorType, ErrorLevel.MEDIUM, undefined, userId, context, true);
    await globalErrorHandler.handleError(appError);
    throw appError;
  }
};