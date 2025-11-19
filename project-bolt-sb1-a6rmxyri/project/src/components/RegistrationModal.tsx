import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { auth } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationSuccess: (userData: User) => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistrationSuccess
}) => {
  const [authStep, setAuthStep] = useState<'register' | 'success' | 'error'>('register');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegistrationSuccess = (userData: User) => {
    setAuthStep('success');
    setTimeout(() => {
      onRegistrationSuccess(userData);
      onClose();
      setAuthStep('register');
      setAgreedToTerms(false);
      setEmail('');
      setPassword('');
    }, 2000);
  };

  const handleRegistrationError = (error: string) => {
    setErrorMessage(error);
    setAuthStep('error');
    setTimeout(() => {
      setAuthStep('register');
    }, 3000);
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      // Supabaseを使用したGoogle認証（新規登録用）
      const { data, error } = await auth.signUpWithGoogle();

      if (error) {
        throw error;
      }

      // OAuth認証の場合、リダイレクトが発生するため、ここでは処理が完了しない
      // 実際の成功処理はOAuthコールバック後に行われる
      console.log('Google認証リダイレクト開始（新規登録）');
    } catch (error: any) {
      console.error('Google認証エラー:', error);
      handleRegistrationError(error.message || 'Google認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!agreedToTerms) {
      handleRegistrationError('利用規約とプライバシーポリシーに同意してください');
      return;
    }

    if (!email || !password) {
      handleRegistrationError('メールアドレスとパスワードを入力してください');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      handleRegistrationError('有効なメールアドレスを入力してください');
      return;
    }

    if (password.length < 6) {
      handleRegistrationError('パスワードは6文字以上で入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await auth.signUpWithEmail(email, password);
      if (error) throw error;

      // すぐにユーザー情報を取得
      const { user } = await auth.getCurrentUser();
      if (user) {
        handleRegistrationSuccess(user as User);
      } else {
        handleRegistrationError('登録に失敗しました。もう一度お試しください');
      }
    } catch (error: any) {
      console.error('メール登録エラー:', error);
      handleRegistrationError(error.message || 'メール登録に失敗しました');
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
              <p className="text-sm text-gray-400">新規登録</p>
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
        {authStep === 'register' && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              新規登録
            </h3>
            <p className="text-gray-400 mb-6">
              アカウントを作成して動画素材を利用開始
            </p>

            {/* ソーシャル登録ボタン */}
            <div className="space-y-4 mb-8">
              {/* Google登録ボタン */}
              <button
                onClick={handleGoogleSignUp}
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
                <span>{isLoading ? '処理中...' : 'Googleで登録'}</span>
              </button>

              {/* 区切り */}
              <div className="relative py-2">
                <div className="absolute inset-0 border-t border-white/10" />
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-500 bg-black/60">または</span>
                </div>
              </div>

              {/* メールで登録（パスワード） */}
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワード（6文字以上）"
                  className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  disabled={isLoading}
                />
                <button
                  onClick={handleEmailSignUp}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span>{isLoading ? '処理中...' : 'メールで登録'}</span>
                </button>
              </div>
            </div>

            {/* 利用規約への同意 */}
            <div className="mb-6">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 text-cyan-500 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-gray-900 cursor-pointer"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors text-left">
                  <a href="/terms" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline">
                    利用規約
                  </a>
                  および
                  <a href="/privacy" target="_blank" className="text-cyan-400 hover:text-cyan-300 underline">
                    プライバシーポリシー
                  </a>
                  に同意します
                </span>
              </label>
            </div>

            {/* ログインリンク */}
            <div className="text-center text-sm text-gray-400">
              すでにアカウントをお持ちの方は
              <button
                onClick={onClose}
                className="text-cyan-400 hover:text-cyan-300 underline ml-1"
              >
                ログイン
              </button>
            </div>
          </div>
        )}

        {authStep === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">登録が完了しました</h3>
            <p className="text-gray-400">料金プランをお選びください...</p>
          </div>
        )}

        {authStep === 'error' && (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">エラーが発生しました</h3>
            <p className="text-gray-400">{errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationModal;
