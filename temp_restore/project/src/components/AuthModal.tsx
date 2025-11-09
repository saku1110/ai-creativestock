import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { AuthUser, AuthResponse } from '../auth/mockAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userData: AuthUser) => void;
  signInWithGoogle: () => Promise<AuthResponse>;
  signInWithApple: () => Promise<AuthResponse>;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  signInWithGoogle, 
  signInWithApple 
}) => {
  const [authStep, setAuthStep] = useState<'login' | 'success' | 'error'>('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSuccess = (userData: AuthUser) => {
    setAuthStep('success');
    setTimeout(() => {
      onAuthSuccess(userData);
      onClose();
      setAuthStep('login');
    }, 2000);
  };

  const handleAuthError = (error: string) => {
    setErrorMessage(error);
    setAuthStep('error');
    setTimeout(() => {
      setAuthStep('login');
    }, 3000);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await signInWithGoogle();
      if (response.success && response.user) {
        handleAuthSuccess(response.user);
      } else {
        handleAuthError(response.error || 'ログインに失敗しました');
      }
    } catch (error) {
      handleAuthError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      const response = await signInWithApple();
      if (response.success && response.user) {
        handleAuthSuccess(response.user);
      } else {
        handleAuthError(response.error || 'ログインに失敗しました');
      }
    } catch (error) {
      handleAuthError('ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative glass-dark rounded-3xl border border-white/20 p-8 max-w-md w-full shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Creative Stock</h2>
              <p className="text-sm text-gray-400">安全なログイン</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* コンテンツ */}
        {authStep === 'login' && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              アカウント作成・ログイン
            </h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              GoogleまたはApple IDでかんたんログイン
            </p>

            {/* ソーシャルログインボタン */}
            <div className="space-y-4 mb-8">
              {/* Googleログインボタン */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                <span>{isLoading ? '認証中...' : 'Googleでログイン・新規登録'}</span>
              </button>

              {/* Apple IDログインボタン */}
              <button
                onClick={handleAppleSignIn}
                disabled={isLoading}
                className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                )}
                <span>{isLoading ? '認証中...' : 'Apple IDでログイン・新規登録'}</span>
              </button>
            </div>

            {/* セキュリティ情報 */}
            <div className="glass-effect rounded-2xl p-4 border border-cyan-400/30">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-bold text-sm">安全性について</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 text-left">
                <li>• OAuth 2.0による安全な認証</li>
                <li>• パスワード不要でセキュリティリスクを軽減</li>
                <li>• 個人情報は暗号化して保護</li>
                <li>• いつでもアカウント連携を解除可能</li>
              </ul>
            </div>
          </div>
        )}

        {authStep === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              ログイン成功！
            </h3>
            <p className="text-gray-400 mb-6">
              AI Creative Stockへようこそ。
              <br />
              高品質SNS動画素材をお楽しみください。
            </p>
            <div className="glass-effect rounded-2xl p-4 border border-green-400/30">
              <p className="text-green-400 font-bold text-sm">
                自動的にリダイレクトしています...
              </p>
            </div>
          </div>
        )}

        {authStep === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              ログインエラー
            </h3>
            <p className="text-gray-400 mb-6">
              {errorMessage}
            </p>
            <div className="glass-effect rounded-2xl p-4 border border-red-400/30">
              <p className="text-red-400 font-bold text-sm">
                しばらくしてから再度お試しください
              </p>
            </div>
          </div>
        )}

        {/* 利用規約 */}
        {authStep === 'login' && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              ログインすることで、
              <a href="#" className="text-cyan-400 hover:underline">利用規約</a>
              および
              <a href="#" className="text-cyan-400 hover:underline">プライバシーポリシー</a>
              に同意したものとみなされます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;