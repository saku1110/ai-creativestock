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

      const defaultMessages: Record<AppError['type'], string> = {
        network: 'ネットワークエラーが発生しました。接続を確認してください。',
        auth: '認証エラーが発生しました。再度ログインしてください。',
        server: 'サーバーで問題が発生しました。時間をおいて再試行してください。',
        client: 'リクエストが不正です。入力内容をご確認ください。',
        validation: '入力値が無効です。内容をご確認ください。',
        unknown: '予期しないエラーが発生しました。',
      };

      const message = context
        ? `${context}: ${error?.message || defaultMessages[errorType]}`
        : (error?.message || defaultMessages[errorType]);

      return addError({
        message,
        type: errorType,
        code: error?.code || error?.status?.toString(),
        details: error,
      });
    },
    [addError, categorizeError]
  );

  const handleSupabaseError = useCallback(
    (error: any, context?: string) => {
      const code = error?.code;
      let type: AppError['type'] = 'unknown';
      let message = error?.message || 'データベース操作でエラーが発生しました。';

      if (code === 'PGRST301' || code === '42501') {
        type = 'auth';
        message = 'アクセス権限がありません。';
      } else if (code === 'PGRST116' || code === '404') {
        type = 'client';
        message = '対象データが見つかりません。';
      } else if (code === '23505') {
        type = 'validation';
        message = '既に登録済みのデータがあります。';
      } else if (code === 'PGRST100') {
        type = 'validation';
        message = '入力値が不正です。';
      }

      const fullMessage = context ? `${context}: ${message}` : message;
      return addError({
        message: fullMessage,
        type,
        code,
        details: error,
      });
    },
    [addError]
  );

  const handleStripeError = useCallback(
    (error: any, context?: string) => {
      const stripeType = error?.type;
      let type: AppError['type'] = 'unknown';
      let message = error?.message || '決済処理でエラーが発生しました。';

      switch (stripeType) {
        case 'card_error':
        case 'invalid_request_error':
          type = 'client';
          message = 'カード情報に問題があります。別のカードでお試しください。';
          break;
        case 'api_connection_error':
          type = 'network';
          message = '決済サービスに接続できませんでした。時間をおいて再試行してください。';
          break;
        case 'api_error':
          type = 'server';
          message = '決済サービス側で問題が発生しました。少し時間を置いて再試行してください。';
          break;
        default:
          type = 'unknown';
          message = error?.message || '決済処理でエラーが発生しました。';
          break;
      }

      const fullMessage = context ? `${context}: ${message}` : message;
      return addError({
        message: fullMessage,
        type,
        code: stripeType,
        details: error,
      });
    },
    [addError]
  );

  const getErrorMessage = useCallback((error: AppError): string => {
    const defaultMessages: Record<AppError['type'], string> = {
      network: 'インターネット接続を確認してください。',
      auth: 'ログインし直してください。',
      server: 'サーバーで問題が発生しています。',
      client: '入力内容を確認してください。',
      validation: '入力内容を確認してください。',
      unknown: 'エラーが発生しました。',
    };

    return error.message || defaultMessages[error.type];
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
    handleSupabaseError,
    handleStripeError,
    getErrorMessage,
    getErrorSeverity,
  };
};

