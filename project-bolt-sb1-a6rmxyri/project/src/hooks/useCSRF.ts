import { useState, useEffect } from 'react';

interface CSRFToken {
  token: string;
  timestamp: number;
  expiresAt: number;
}

const CSRF_TOKEN_KEY = 'csrf_token';
const TOKEN_EXPIRY_TIME = 30 * 60 * 1000; // 30分

export const useCSRF = () => {
  const [csrfToken, setCSRFToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // CSRFトークンを生成する関数
  const generateCSRFToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  // CSRFトークンを取得または生成
  const getCSRFToken = (): string => {
    try {
      const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
      
      if (storedToken) {
        const tokenData: CSRFToken = JSON.parse(storedToken);
        const now = Date.now();
        
        // トークンが有効期限内かチェック
        if (now < tokenData.expiresAt) {
          return tokenData.token;
        }
      }
    } catch (error) {
      console.warn('CSRF token parsing error:', error);
    }

    // 新しいトークンを生成
    const newToken = generateCSRFToken();
    const now = Date.now();
    const tokenData: CSRFToken = {
      token: newToken,
      timestamp: now,
      expiresAt: now + TOKEN_EXPIRY_TIME
    };

    try {
      sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
    } catch (error) {
      console.warn('Failed to store CSRF token:', error);
    }

    return newToken;
  };

  // CSRFトークンを検証する関数
  const validateCSRFToken = (receivedToken: string): boolean => {
    try {
      const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
      
      if (!storedToken) {
        return false;
      }

      const tokenData: CSRFToken = JSON.parse(storedToken);
      const now = Date.now();
      
      // トークンの有効期限とマッチングをチェック
      return (
        now < tokenData.expiresAt &&
        tokenData.token === receivedToken
      );
    } catch (error) {
      console.warn('CSRF token validation error:', error);
      return false;
    }
  };

  // CSRFトークンを無効化
  const invalidateCSRFToken = (): void => {
    try {
      sessionStorage.removeItem(CSRF_TOKEN_KEY);
    } catch (error) {
      console.warn('Failed to invalidate CSRF token:', error);
    }
  };

  // 初期化
  useEffect(() => {
    const token = getCSRFToken();
    setCSRFToken(token);
    setIsLoading(false);
  }, []);

  // トークンを定期的に更新
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getCSRFToken();
      setCSRFToken(token);
    }, TOKEN_EXPIRY_TIME / 2); // 半分の時間で更新

    return () => clearInterval(interval);
  }, []);

  return {
    csrfToken,
    isLoading,
    getCSRFToken,
    validateCSRFToken,
    invalidateCSRFToken,
    refreshToken: () => {
      invalidateCSRFToken();
      const newToken = getCSRFToken();
      setCSRFToken(newToken);
      return newToken;
    }
  };
};