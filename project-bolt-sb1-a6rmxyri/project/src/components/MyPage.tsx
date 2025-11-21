import React, { useState } from 'react';
import { User, Crown, Calendar, Download, TrendingUp, AlertTriangle, CheckCircle, X, CreditCard, Shield, Zap, LogOut, Settings, ExternalLink, Receipt, History, Film, Heart } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { auth, database } from '../lib/supabase';
import { stripeService } from '../lib/stripe';
import UpgradePromptModal from './UpgradePromptModal';
import Sidebar from './Sidebar';

interface MyPageProps {
  onPageChange: (page: string) => void;
}

const MyPage: React.FC<MyPageProps> = ({ onPageChange }) => {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user, profile, subscription, monthlyDownloads, remainingDownloads, loading, isTrialUser, trialDaysRemaining, trialDownloadsRemaining } = useUser();

  // ローディング中の表示
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

  // プラン情報の整理
  const currentPlan = subscription ? {
    name: subscription.plan === 'standard' ? 'スタンダード' : 
          subscription.plan === 'pro' ? 'プロ' : 'ビジネス',
    monthlyPrice: subscription.plan === 'standard' ? 14800 : 
                  subscription.plan === 'pro' ? 29800 : 49800,
    yearlyPrice: subscription.plan === 'standard' ? 9800 * 12 : 
                 subscription.plan === 'pro' ? 19800 * 12 : 29800 * 12,
    currentPrice: subscription.billing_cycle === 'yearly' ? 
                  (subscription.plan === 'standard' ? 9800 : 
                   subscription.plan === 'pro' ? 19800 : 29800) :
                  (subscription.plan === 'standard' ? 14800 : 
                   subscription.plan === 'pro' ? 29800 : 49800),
    billingCycle: subscription.billing_cycle || 'monthly',
    downloadsPerMonth: subscription.monthly_download_limit,
    remainingDownloads: remainingDownloads,
    nextBillingDate: subscription.current_period_end,
    isActive: subscription.status === 'active'
  } : {
    name: '未登録',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currentPrice: 0,
    billingCycle: 'monthly',
    downloadsPerMonth: 0,
    remainingDownloads: 0,
    nextBillingDate: '',
    isActive: false
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) {
      alert('サブスクリプション情報が見つかりません。');
      return;
    }

    try {
      const result = await stripeService.createCustomerPortalSession(
        subscription.stripe_customer_id
      );
      
      if (result.error) {
        alert(result.error);
        return;
      }

      if (result.url) {
        // Stripe Customer Portalに遷移
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Customer portal error:', error);
      alert('サブスクリプション管理ページへの遷移に失敗しました。');
    }
  };


  const handleLogout = async () => {
    try {
      // 開発環境では localStorage をクリア
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
        window.location.href = '/';
      } else {
        await auth.signOut();
      }
      setShowLogoutModal(false);
      // ログアウト成功後はApp.tsxの認証状態監視でリダイレクトされる
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました。再度お試しください。');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#ffffff' }}>
      {/* サイドバー */}
      <Sidebar currentPage="mypage" onPageChange={onPageChange} />
      
      {/* メインコンテンツ */}
      <div style={{ marginLeft: '260px', padding: '20px 30px' }}>
        <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4">
            <span className="gradient-text">マイページ</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400">
            アカウント情報と料金プランの管理
          </p>
        </div>

        {/* ユーザー情報 */}
        <div className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">{profile?.name || user?.user_metadata?.full_name || '名前未設定'}</h2>
                <p className="text-sm sm:text-base text-gray-400">{profile?.email || user?.email || 'メールアドレス未設定'}</p>
                <div className="flex items-center space-x-2 mt-1 sm:mt-2">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-xs text-gray-500">Googleアカウント連携済み</span>
                </div>
              </div>
            </div>
            
            {/* ログアウトボタン */}
            <div className="flex justify-start sm:justify-end sm:ml-auto">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-400 hover:text-red-400 transition-colors font-medium text-sm sm:text-base"
              >
                <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>

        {/* 現在のプラン情報 */}
        <div className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center space-x-2">
            <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            <span>現在の料金プラン</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* プラン詳細 */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">プラン名</span>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className="text-white font-bold text-sm sm:text-lg">{currentPlan.name}</span>
                  <div className="glass-effect px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-cyan-400/30 text-cyan-400 text-xs sm:text-sm">
                    アクティブ
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">
                  {currentPlan.billingCycle === 'yearly' ? '月額料金（年額プラン）' : '月額料金'}
                </span>
                <div className="text-right">
                  <span className="text-white font-bold text-sm sm:text-lg">
                    {formatPrice(currentPlan.currentPrice)}
                    {currentPlan.billingCycle === 'yearly' && '/月'}
                  </span>
                  {currentPlan.billingCycle === 'yearly' && (
                    <div className="text-xs text-gray-500">
                      年額: {formatPrice(currentPlan.yearlyPrice)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">次回請求日</span>
                <span className="text-white font-medium text-sm sm:text-base">{formatDate(currentPlan.nextBillingDate)}</span>
              </div>
            </div>

            {/* ダウンロード数 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">月間ダウンロード数</span>
                <span className="text-white font-bold text-lg">{currentPlan.downloadsPerMonth}本</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">今月の残り</span>
                <span className="text-cyan-400 font-bold text-lg">{currentPlan.remainingDownloads}本</span>
              </div>
              
              {/* プログレスバー */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">使用状況</span>
                  <span className="text-gray-400">
                    {currentPlan.downloadsPerMonth - currentPlan.remainingDownloads}/{currentPlan.downloadsPerMonth}本
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${((currentPlan.downloadsPerMonth - currentPlan.remainingDownloads) / currentPlan.downloadsPerMonth) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <button 
              onClick={handleManageSubscription}
              className="cyber-button text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>プラン変更・解約</span>
            </button>
            
            <button 
              onClick={() => onPageChange('payment-history')}
              className="glass-effect border border-white/20 text-gray-300 hover:text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 font-bold hover:bg-white/5 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base"
            >
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>決済履歴</span>
            </button>
            
            <button 
              onClick={() => onPageChange('download-history')}
              className="glass-effect border border-white/20 text-gray-300 hover:text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 font-bold hover:bg-white/5 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>ダウンロード履歴</span>
            </button>
          </div>
        </div>

        {/* サブスクリプション詳細 */}
        <div className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10 mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            <span>サブスクリプション詳細</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">ステータス</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-bold text-sm sm:text-base">
                    {subscription?.status === 'active' ? 'アクティブ' : subscription?.status || '未登録'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">請求サイクル</span>
                <div className="text-right">
                  <span className="text-white font-medium text-sm sm:text-base">
                    {subscription?.billing_cycle === 'yearly' ? '年額払い' : '月額払い'}
                  </span>
                  {subscription?.billing_cycle === 'yearly' && (
                    <div className="text-xs text-green-400">
                      年額プランで約{Math.round(((currentPlan.monthlyPrice * 12) - currentPlan.yearlyPrice) / (currentPlan.monthlyPrice * 12) * 100)}%お得
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">自動更新</span>
                <span className="text-white font-medium text-sm sm:text-base">
                  {subscription?.cancel_at_period_end ? '停止予定' : '有効'}
                </span>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">契約開始日</span>
                <span className="text-white font-medium text-sm sm:text-base">
                  {subscription?.created_at ? 
                    formatDate(subscription.created_at).split(' ')[0] : 
                    '未設定'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm sm:text-base">サポート</span>
                <div className="text-right">
                  <span className="text-white font-medium text-sm sm:text-base">
                    {subscription?.plan === 'standard' ? 'メールサポート' : 
                     subscription?.plan === 'pro' ? '優先サポート' : 
                     (subscription?.plan === 'enterprise' || subscription?.plan === 'business') ? '24時間サポート' : 
                     '未設定'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 利用統計 */}
        <div className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center space-x-2">
            <Download className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            <span>利用統計</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Download className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2">
                {currentPlan.downloadsPerMonth - currentPlan.remainingDownloads}
              </h4>
              <p className="text-gray-400 text-xs sm:text-sm">今月のダウンロード数</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2">
                {subscription ? Math.max(1, Math.ceil((Date.now() - new Date(subscription.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0}
              </h4>
              <p className="text-gray-400 text-xs sm:text-sm">利用月数</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2">
                {currentPlan.remainingDownloads}
              </h4>
              <p className="text-gray-400 text-xs sm:text-sm">残りダウンロード数</p>
            </div>
          </div>
        </div>
      </div>


      {/* ログアウト確認モーダル */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">ログアウト確認</h3>
              <p className="text-gray-400 text-sm">
                本当にログアウトしますか？<br />
                再度ログインするにはGoogleアカウントでサインインしてください。
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
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

      {/* アップグレードモーダル */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
          window.location.reload();
        }}
        trialDaysRemaining={trialDaysRemaining}
        downloadsRemaining={isTrialUser ? trialDownloadsRemaining : remainingDownloads}
        reason="usage_warning"
      />
      </div>
    </div>
  );
};

export default MyPage;
