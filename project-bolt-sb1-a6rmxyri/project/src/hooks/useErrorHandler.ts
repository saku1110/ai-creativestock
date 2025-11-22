import { useCallback, useState } from 'react';

export interface AppError {
  message: string;
  code?: string;
  type: 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown';
  details?: any;
  timestamp: Date;
}

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<AppError[]>([]);

  const addError = useCallback((error: Partial<AppError> & { message: string }) => {
    const appError: AppError = {
      type: 'unknown',
      timestamp: new Date(),
      ...error,
    };
    setErrors((prev) => [...prev, appError]);

    // 10秒後に自動クリア
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.timestamp !== appError.timestamp));
    }, 10000);

    console.error('Application Error:', appError);
    return appError;
  }, []);

  const removeError = useCallback((timestamp: Date) => {
    setErrors((prev) => prev.filter((e) => e.timestamp !== timestamp));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const categorizeError = useCallback((error: any): AppError['type'] => {
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') return 'network';
    if (error?.status === 401 || error?.code === 'UNAUTHORIZED') return 'auth';
    if (error?.status >= 500) return 'server';
    if (error?.status >= 400 && error?.status < 500) return 'client';
    if (error?.name === 'ValidationError') return 'validation';
    return 'unknown';
  }, []);

  const handleApiError = useCallback(
    (error: any, context?: string) => {
      const errorType = categorizeError(error);
      let message = 'エラーが発生しました。';

      switch (errorType) {
        case 'network':
          message = 'ネットワークエラーです。接続を確認してください。';
          break;
        case 'auth':
          message = '認証エラーです。ログインし直してください。';
          break;
        case 'server':
          message = 'サーバーで問題が発生しました。時間をおいて再試行してください。';
          break;
        case 'client':
          message = 'リクエストが不正です。入力内容を確認してください。';
          break;
        case 'validation':
          message = error?.message || '入力値が無効です。';
          break;
        default:
          message = error?.message || '予期しないエラーが発生しました。';
      }

      return addError({
        message: context ? `${context}: ${message}` : message,
        type: errorType,
        code: error?.code || error?.status?.toString(),
        details: error,
      });
    },
    [addError, categorizeError]
  );

  const getErrorMessage = useCallback((error: AppError): string => {
    switch (error.type) {
      case 'network':
        return 'インターネット接続を確認してください。';
      case 'auth':
        return 'ログインし直してください。';
      case 'server':
        return 'サーバーで問題が発生しています。';
      case 'validation':
        return '入力内容を確認してください。';
      default:
        return error.message;
    }
  }, []);

  const getErrorSeverity = useCallback((error: AppError): 'low' | 'medium' | 'high' | 'critical' => {
    switch (error.type) {
      case 'auth':
        return 'high';
      case 'server':
        return 'critical';
      case 'network':
        return 'medium';
      case 'validation':
        return 'low';
      default:
        return 'low';
    }
  }, []);

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleApiError,
    getErrorMessage,
    getErrorSeverity,
  };
};
