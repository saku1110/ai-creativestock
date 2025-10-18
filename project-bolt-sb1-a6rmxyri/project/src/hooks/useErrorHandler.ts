import { useState, useCallback } from 'react';

export interface AppError {
  message: string;
  code?: string;
  type: 'network' | 'validation' | 'auth' | 'server' | 'client' | 'unknown';
  details?: any;
  timestamp: Date;
}

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<AppError[]>([]);

  // エラーを追加
  const addError = useCallback((error: Partial<AppError> & { message: string }) => {
    const appError: AppError = {
      type: 'unknown',
      timestamp: new Date(),
      ...error
    };

    setErrors(prev => [...prev, appError]);

    // 自動でエラーをクリア（10秒後）
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.timestamp !== appError.timestamp));
    }, 10000);

    // コンソールにログ出力
    console.error('Application Error:', appError);

    return appError;
  }, []);

  // 特定のエラーを削除
  const removeError = useCallback((timestamp: Date) => {
    setErrors(prev => prev.filter(e => e.timestamp !== timestamp));
  }, []);

  // 全てのエラーをクリア
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // エラーのカテゴライズ
  const categorizeError = useCallback((error: any): AppError['type'] => {
    if (error?.code === 'NETWORK_ERROR' || error?.name === 'NetworkError') {
      return 'network';
    }
    if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
      return 'auth';
    }
    if (error?.status >= 500) {
      return 'server';
    }
    if (error?.status >= 400 && error?.status < 500) {
      return 'client';
    }
    if (error?.name === 'ValidationError') {
      return 'validation';
    }
    return 'unknown';
  }, []);

  // APIエラーハンドラー
  const handleApiError = useCallback((error: any, context?: string) => {
    const errorType = categorizeError(error);
    let message = 'エラーが発生しました';

    switch (errorType) {
      case 'network':
        message = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
        break;
      case 'auth':
        message = '認証エラーです。再度ログインしてください。';
        break;
      case 'server':
        message = 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。';
        break;
      case 'client':
        message = 'リクエストエラーです。入力内容を確認してください。';
        break;
      case 'validation':
        message = error.message || '入力値が無効です。';
        break;
      default:
        message = error.message || '予期しないエラーが発生しました。';
    }

    return addError({
      message: context ? `${context}: ${message}` : message,
      type: errorType,
      code: error.code || error.status?.toString(),
      details: error
    });
  }, [addError, categorizeError]);

  // ユーザーフレンドリーなエラーメッセージ取得
  const getErrorMessage = useCallback((error: AppError): string => {
    switch (error.type) {
      case 'network':
        return 'インターネット接続を確認してください';
      case 'auth':
        return 'ログインし直してください';
      case 'server':
        return 'サーバーで問題が発生しています';
      case 'validation':
        return '入力内容を確認してください';
      default:
        return error.message;
    }
  }, []);

  // エラーの重要度判定
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
        return 'medium';
    }
  }, []);

  // Supabaseエラー専用ハンドラー
  const handleSupabaseError = useCallback((error: any, operation?: string) => {
    let message = 'データベース操作でエラーが発生しました';
    let type: AppError['type'] = 'server';

    if (error?.code === 'PGRST301') {
      message = 'アクセス権限がありません';
      type = 'auth';
    } else if (error?.code === 'PGRST116') {
      message = 'データが見つかりません';
      type = 'client';
    } else if (error?.message?.includes('network')) {
      message = 'ネットワークエラーが発生しました';
      type = 'network';
    }

    return addError({
      message: operation ? `${operation}: ${message}` : message,
      type,
      code: error?.code,
      details: error
    });
  }, [addError]);

  // Stripeエラー専用ハンドラー
  const handleStripeError = useCallback((error: any) => {
    let message = '決済処理でエラーが発生しました';
    let type: AppError['type'] = 'client';

    switch (error?.type) {
      case 'card_error':
        message = 'カード情報に問題があります。カード情報を確認してください。';
        break;
      case 'validation_error':
        message = '入力情報が無効です。内容を確認してください。';
        type = 'validation';
        break;
      case 'api_error':
        message = '決済サービスでエラーが発生しました。しばらく時間をおいてから再度お試しください。';
        type = 'server';
        break;
      case 'api_connection_error':
        message = '決済サービスに接続できません。インターネット接続を確認してください。';
        type = 'network';
        break;
      case 'rate_limit_error':
        message = 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください。';
        break;
      default:
        message = error?.message || message;
    }

    return addError({
      message,
      type,
      code: error?.code,
      details: error
    });
  }, [addError]);

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
    hasErrors: errors.length > 0,
    latestError: errors[errors.length - 1] || null
  };
};