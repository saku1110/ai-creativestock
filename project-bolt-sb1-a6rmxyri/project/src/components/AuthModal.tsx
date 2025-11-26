import React, { useEffect, useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { auth } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userData: User) => void;
  mode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  mode = 'register',
}) => {
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'success' | 'error' | 'email_sent'>(mode);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
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
    } catch {
      return { attempts: 0, until: 0 };
    }
  };
  const saveLock = (addr: string, attempts: number, until: number) => {
    try {
      localStorage.setItem(keyFor(addr), JSON.stringify({ attempts, until }));
    } catch {}
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
    try {
      localStorage.removeItem(`login_lockout_${(userData.email || '').toLowerCase()}`);
    } catch {}
    setTimeout(() => {
      onAuthSuccess(userData);
      onClose();
      setAuthStep(mode);
    }, 1200);
  };

  const handleAuthError = (error: string) => {
    setErrorMessage(error);
    setAuthStep('error');
    try {
      if (email) {
        const key = keyFor(email);
        const raw = localStorage.getItem(key);
        const v = raw ? JSON.parse(raw) : { attempts: 0, until: 0 };
        const attempts = (Number(v.attempts) || 0) + 1;
        if (attempts >= MAX_ATTEMPTS) {
          const untilTs = Date.now() + LOCK_MINUTES * 60 * 1000;
          localStorage.setItem(key, JSON.stringify({ attempts, until: untilTs }));
          setLockoutUntil(untilTs);
        } else {
          localStorage.setItem(key, JSON.stringify({ attempts, until: 0 }));
        }
      }
    } catch {}
    setTimeout(() => setAuthStep(mode), 2000);
  };

  const handleGoogle = async () => {
    const until = checkLocked(email);
    if (until) {
      const mins = Math.ceil((until - Date.now()) / 60000);
      handleAuthError(`試行回数を超えたためロック中です（残り約${mins}分）`);
      setLockoutUntil(until);
      return;
    }
    setIsLoading(true);
    try {
      const { error } = mode === 'login'
        ? await auth.signInWithGoogle()
        : await auth.signUpWithGoogle();
      if (error) throw error;
      // 正常時はブラウザがGoogleの画面へ遷移するだけなので、そのまま終了
    } catch (error: any) {
      let msg = mode === 'login' ? 'Googleログインに失敗しました。' : 'Googleでの新規登録に失敗しました。';
      if (error instanceof Error) {
        const lower = error.message.toLowerCase();
        if (error.message.includes('popup_closed_by_user')) {
          msg = mode === 'login' ? 'ログインがキャンセルされました。' : '登録がキャンセルされました。';
        } else if (lower.includes('network')) {
          msg = 'ネットワークエラーです。接続を確認してください。';
        } else if (lower.includes('configuration')) {
          msg = 'Google認証の設定に問題があります。管理者までお問い合わせください。';
        } else {
          msg = `${mode === 'login' ? 'Googleログイン' : 'Google登録'}エラー: ${error.message}`;
        }
      }
      handleAuthError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailPassword = async () => {
    if (!email || !password) {
      handleAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      handleAuthError('パスワードは8文字以上で入力してください。');
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'register') {
        // 新規登録の場合
        const { error } = await auth.signUpWithEmail(email, password);
        if (error) throw error;
        // メール確認が必要な場合、確認メール送信完了画面を表示
        setAuthStep('email_sent');
      } else {
        // ログインの場合
        const { error } = await auth.signInWithEmail(email, password);
        if (error) throw error;
        const { user } = await auth.getCurrentUser();
        if (user) {
          handleAuthSuccess(user);
        } else {
          handleAuthError('ログインに失敗しました。');
        }
      }
    } catch (e: any) {
      handleAuthError(e?.message || (mode === 'login' ? 'メールログインに失敗しました。' : 'メール登録に失敗しました。'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAuthStep(mode);
      setErrorMessage('');
    }
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const heading = mode === 'login' ? 'ログイン' : '新規登録';
  const subHeading = mode === 'login' ? '安全なログイン' : '安全な新規登録';
  const buttonGoogle = mode === 'login' ? 'Googleでログイン' : 'Googleで新規登録';
  const buttonEmail = mode === 'login' ? 'メールでログイン' : 'メールで新規登録';

  const isLocked = lockoutUntil && lockoutUntil > Date.now();
  const lockMinutes = isLocked ? Math.ceil((lockoutUntil - Date.now()) / 60000) : null;

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
              <p className="text-sm text-gray-400">{subHeading}</p>
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
        {(authStep === 'register' || authStep === 'login') && (
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              {heading}
            </h3>

            {/* ソーシャルボタン */}
            <div className="space-y-4 mb-8">
              <button
                onClick={handleGoogle}
                disabled={isLoading || isLocked}
                className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                  (isLoading || isLocked) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>{isLoading ? '認証中...' : buttonGoogle}</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 border-t border-white/10" />
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-gray-500 bg-black/60">または</span>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEmailPassword();
                }}
                className="grid grid-cols-1 gap-3"
              >
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
                  placeholder={mode === 'login' ? 'パスワード' : 'パスワード（8文字以上）'}
                  className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>{buttonEmail}</span>
                </button>
              </form>
            </div>

            <div className="glass-effect rounded-2xl p-4 border border-cyan-400/30">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-bold text-sm">安心して始められます</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1 text-left">
                <li>• OAuth 2.0 による安全な認証</li>
                <li>• メールまたは Google で{mode === 'login' ? 'ログイン' : '登録'}可能</li>
                <li>• 個人情報は暗号化して保護</li>
                <li>• いつでも連携解除が可能</li>
              </ul>
              {isLocked && (
                <p className="text-xs text-red-400 mt-2">
                  試行回数を超えたためロック中です（残り約{lockMinutes}分）
                </p>
              )}
            </div>
          </div>
        )}

        {authStep === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {mode === 'login' ? 'ログイン成功' : '登録完了'}
            </h3>
            <p className="text-gray-400 mb-6">
              AI Creative Stockへようこそ。
              <br />
              高品質SNS動画素材をお楽しみください。
            </p>
          </div>
        )}

        {authStep === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {mode === 'login' ? 'ログインエラー' : '登録エラー'}
            </h3>
            <p className="text-gray-400 mb-6">
              {errorMessage}
            </p>
          </div>
        )}

        {authStep === 'email_sent' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              確認メールを送信しました
            </h3>
            <p className="text-gray-400 mb-6">
              <span className="text-cyan-400 font-medium">{email}</span> に確認メールを送信しました。
              <br />
              メール内のリンクをクリックして登録を完了してください。
            </p>
            <div className="glass-effect rounded-2xl p-4 border border-cyan-400/30 mb-6">
              <p className="text-xs text-gray-400">
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5"
            >
              閉じる
            </button>
          </div>
        )}

        {(authStep === 'register' || authStep === 'login') && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {mode === 'login' ? 'ログインすることで、' : '登録することで、'}
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

