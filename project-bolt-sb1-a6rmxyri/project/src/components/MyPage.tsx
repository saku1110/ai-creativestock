import React, { useMemo, useState } from 'react';
import { LogOut, CreditCard, Download, Settings, Receipt, History, Calendar, Shield } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { auth } from '../lib/supabase';
import { stripeService } from '../lib/stripe';

interface MyPageProps {
  onPageChange: (page: string) => void;
}

const MyPage: React.FC<MyPageProps> = ({ onPageChange }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, subscription, monthlyDownloads, remainingDownloads, loading, isTrialUser, trialDaysRemaining, trialDownloadsRemaining } = useUser();

  const planName = useMemo(() => {
    const plan = subscription?.plan;
    if (plan === 'standard') return 'スタンダード';
    if (plan === 'pro') return 'プロ';
    if (plan === 'business') return 'ビジネス';
    if (plan === 'enterprise') return 'エンタープライズ';
    return '未登録';
  }, [subscription]);

  const billingCycle = subscription?.billing_cycle === 'yearly' ? '年額' : '月額';
  const nextBilling = subscription?.current_period_end || '';
  const status = subscription?.status || '未登録';

  const downloadLimit = isTrialUser
    ? subscription?.trial_downloads_limit ?? 0
    : subscription?.monthly_download_limit ?? 0;
  const remaining = isTrialUser ? trialDownloadsRemaining : remainingDownloads;
  const used = downloadLimit ? Math.max(0, downloadLimit - remaining) : monthlyDownloads;
  const progress = downloadLimit ? Math.min(100, Math.round((used / downloadLimit) * 100)) : 0;

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) {
      alert('サブスクリプション情報が見つかりません。');
      return;
    }
    try {
      const result = await stripeService.createCustomerPortalSession(subscription.stripe_customer_id);
      if (result.error) {
        alert(result.error);
        return;
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Customer portal error:', error);
      alert('サブスクリプション管理ページへの遷移に失敗しました。');
    }
  };

  const handleLogout = async () => {
    try {
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
        window.location.href = '/';
      } else {
        await auth.signOut();
      }
    } catch (error) {
      console.error('logout error:', error);
      alert('ログアウトに失敗しました。時間をおいて再度お試しください。');
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto p-6 lg:p-10 space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-black mb-2">マイページ</h1>
          <p className="text-gray-400 text-sm">契約状況とダウンロード枠を確認できます。</p>
        </header>

        <section className="glass-effect rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                <span>{user?.email || 'メール未登録'}</span>
              </div>
              <p className="text-2xl font-bold">{planName}</p>
              <p className="text-sm text-gray-400">
                {billingCycle} / ステータス: {status} / 次回請求日: {formatDate(nextBilling)}
              </p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-gray-400 hover:text-white text-sm flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span>ログアウト</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>月間上限</span>
                <Download className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-2">{downloadLimit || '無制限'}</p>
              <p className="text-xs text-gray-500">トライアル残日数: {isTrialUser ? trialDaysRemaining : 0}日</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>残りダウンロード数</span>
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-2">{remaining}</p>
              <div className="mt-2 w-full bg-gray-800 h-2 rounded-full">
                <div
                  className="h-2 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>今月の利用</span>
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold mt-2">{used}</p>
              <p className="text-xs text-gray-500">合計ダウンロード数（今月）</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={handleManageSubscription}
              className="cyber-button text-white py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>プラン変更・解約</span>
            </button>
            <button
              onClick={() => onPageChange('payment-history')}
              className="glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-lg transition-all font-bold flex items-center justify-center space-x-2"
            >
              <Receipt className="w-4 h-4" />
              <span>決済履歴</span>
            </button>
            <button
              onClick={() => onPageChange('download-history')}
              className="glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-lg transition-all font-bold flex items-center justify-center space-x-2"
            >
              <History className="w-4 h-4" />
              <span>ダウンロード履歴</span>
            </button>
          </div>
        </section>

        <section className="glass-effect rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-bold mb-4">ヘルプとポリシー</h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-300 space-y-3 sm:space-y-0">
            <div className="space-y-1">
              <p>ライセンス・利用条件の確認はこちらから。</p>
              <p>サポートが必要な場合はお問い合わせください。</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => onPageChange('terms')}
                className="glass-effect border border-white/20 px-4 py-2 rounded-lg hover:bg-white/5"
              >
                利用規約
              </button>
              <button
                onClick={() => onPageChange('contact')}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-700"
              >
                お問い合わせ
              </button>
            </div>
          </div>
        </section>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ログアウト確認</h3>
              <p className="text-gray-400 text-sm">ログアウトしてもよろしいですか？</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl transition-all font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 px-4 rounded-xl font-bold transition-all"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;
