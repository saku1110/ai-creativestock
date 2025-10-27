import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { auth } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userData: User) => void;
  redirectToPricing?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuthSuccess,
  redirectToPricing = false
}) => {
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'success' | 'error'>('login');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [password, setPassword] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const MAX_ATTEMPTS = 10;
  const LOCK_MINUTES = 30;

  const keyFor = (addr: string) => `login_lockout_${addr.toLowerCase()}`;
  const nowTs = () => Date.now();
  const loadLock = (addr: string) => {
    try {
      const raw = localStorage.getItem(keyFor(addr));
      if (!raw) return { attempts: 0, until: 0 };
      const v = JSON.parse(raw);
      return { attempts: Number(v.attempts) || 0, until: Number(v.until) || 0 };
    } catch { return { attempts: 0, until: 0 }; }
  };
  const saveLock = (addr: string, attempts: number, until: number) => {
    try { localStorage.setItem(keyFor(addr), JSON.stringify({ attempts, until })); } catch {}
  };
  const resetLock = (addr: string) => saveLock(addr, 0, 0);
  const checkLocked = (addr: string) => {
    const st = loadLock(addr);
    if (st.until && st.until > nowTs()) return st.until;
    if (st.until && st.until <= nowTs()) resetLock(addr);
    return 0;
  };

  const handleAuthSuccess = (userData: User) => {
    setAuthStep('success');
    // reset lockout on successful login
    try { localStorage.removeItem(`login_lockout_${(userData.email || '').toLowerCase()}`) } catch {}
    setTimeout(() => {
      onAuthSuccess(userData);
      onClose();
      setAuthStep('login');
    }, 2000);
  };

  const handleAuthError = (error: string) => {
    setErrorMessage(error);
    setAuthStep('error');
    // increment attempts for lockout
    try {
      if (email) {
        const key = `login_lockout_${email.toLowerCase()}`;
        const raw = localStorage.getItem(key);
        const v = raw ? JSON.parse(raw) : { attempts: 0, until: 0 };
        const attempts = (Number(v.attempts) || 0) + 1;
        if (attempts >= 10) {
          const untilTs = Date.now() + 30 * 60 * 1000;
          localStorage.setItem(key, JSON.stringify({ attempts, until: untilTs }));
          setLockoutUntil(untilTs);
        } else {
          localStorage.setItem(key, JSON.stringify({ attempts, until: 0 }));
        }
      }
    } catch {}
    setTimeout(() => {
      setAuthStep('login');
    }, 3000);
  };

  const handleGoogleSignIn = async () => {
    // lockout check before attempting login
    const until = checkLocked(email);
    if (until) {
      const mins = Math.ceil((until - Date.now()) / 60000);
      handleAuthError(`試行回数超過のためロック中です（約${mins}分）`);
      setLockoutUntil(until);
      return;
    }
    setIsLoading(true);
    try {
      // Supabaseを使用したGoogle認証
      const { data, error } = await auth.signInWithGoogle();
      
      if (error) {
        throw error;
      }
      
      // 認証成功後、少し待ってからユーザー情報を取得
      setTimeout(async () => {
        try {
          const { user: currentUser } = await auth.getCurrentUser();
          if (currentUser) {
            console.log('Google認証成功:', currentUser.email);
            handleAuthSuccess(currentUser);
          }
        } catch (userError) {
          console.error('認証後のユーザー取得エラー:', userError);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Google認証エラー:', error);
      
      let errorMessage = 'Googleログインに失敗しました。';
      
      if (error instanceof Error) {
        if (error.message.includes('popup_closed_by_user')) {
          errorMessage = 'ログインがキャンセルされました。';
        } else if (error.message.includes('network')) {
          errorMessage = 'ネットワークエラーです。インターネット接続を確認してください。';
        } else if (error.message.includes('configuration')) {
          errorMessage = 'Google認証の設定に問題があります。管理者にお問い合わせください。';
        } else if (error.message.includes('Invalid provider')) {
          errorMessage = 'Google認証が有効になっていません。設定を確認してください。';
        } else {
          errorMessage = `Googleログインエラー: ${error.message}`;
        }
      }
      
      handleAuthError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // メールのマジックリンクを送信
  const handleEmailMagicLink = async () => {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      handleAuthError('有効なメールアドレスを入力してください。');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await auth.signInWithMagicLink(email);
      if (error) throw error;
      setEmailSent(true);
      setAuthStep('success');
    } catch (e: any) {
      handleAuthError(e?.message || 'メール送信に失敗しました。時間をおいてお試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // メール + パスワードでログイン
  const handleEmailPasswordLogin = async () => {
    if (!email || !password) {
      handleAuthError('メールとパスワードを入力してください');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await auth.signInWithEmail(email, password);
      if (error) throw error;
      // すぐにユーザー情報を取得
      const { user } = await auth.getCurrentUser();
      if (user) {
        handleAuthSuccess(user as User);
      } else {
        handleAuthError('ログインに失敗しました。もう一度お試しください');
      }
    } catch (e: any) {
      handleAuthError(e?.message || 'メールログインに失敗しました');
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
              ログイン
            </h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Googleでログイン
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
                <span>{isLoading ? '認証中...' : 'Googleでログイン'}</span>
                </button>

                {/* 区切り */}
                <div className="relative py-2">
                  <div className="absolute inset-0 border-t border-white/10" />
                  <div className="relative flex justify-center">
                    <span className="px-3 text-xs text-gray-500 bg-black/60">または</span>
                  </div>
                </div>

                {/* メールでログイン（パスワード） */}
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
                    placeholder="パスワード"
                    className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleEmailPasswordLogin}
                    disabled={isLoading}
                    className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    <span>メールでログイン</span>
                  </button>
                </div>

                {/* 任意: Magic Link も利用可能 */}
                <div className="grid grid-cols-1 gap-3 mt-2">
                  <button
                    onClick={handleEmailMagicLink}
                    disabled={isLoading || emailSent}
                    className={`w-full text-xs flex items-center justify-center space-x-2 glass-effect border border-white/10 text-gray-300 hover:text-cyan-300 px-4 py-2 rounded-lg transition-all ${
                      (isLoading || emailSent) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span>{emailSent ? '送信済み: メールをご確認ください' : 'またはメールにログインリンクを送信'}</span>
                  </button>
                </div>

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
