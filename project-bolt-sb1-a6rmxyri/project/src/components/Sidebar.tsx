import React from 'react';
import { Film, User, History, Heart, Crown, Zap, Star } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useAdmin } from '../hooks/useAdmin';
import { subscriptionPlans } from '../lib/stripe';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { user, subscription, remainingDownloads, isTrialUser, trialDaysRemaining, trialDownloadsRemaining, monthlyDownloads } = useUser();
  const isTestEnv = import.meta.env.VITE_APP_ENV === 'test' || import.meta.env.MODE === 'test' || import.meta.env.DEV;
  const resolvedPlanId =
    subscription?.plan ??
    (subscription as any)?.plan_id ??
    (isTestEnv ? 'standard' : undefined);

  const planLimit = (() => {
    if (subscription?.monthly_download_limit) return subscription.monthly_download_limit;
    const plan = subscriptionPlans.find((p) => p.id === resolvedPlanId);
    return plan?.monthlyDownloads ?? 0;
  })();

  const displayedRemaining = resolvedPlanId
    ? Math.max(0, remainingDownloads || Math.max(0, planLimit - monthlyDownloads))
    : 0;

  const { isAdmin } = useAdmin();

  // プラン判定
  const isEnterpriseUser = resolvedPlanId === 'enterprise' || resolvedPlanId === 'business';
  const shouldShowUpgrade = !isEnterpriseUser;

  // プラン情報の取得
  const getPlanInfo = () => {
    if (isTrialUser) {
      return {
        name: 'スタータープラン',
        icon: Star,
        color: 'text-gray-400',
        bgColor: 'bg-gray-700',
        downloads: trialDownloadsRemaining,
        limit: subscription?.trial_downloads_limit || 3,
        daysLeft: trialDaysRemaining
      };
    }

    // subscriptionPlansからプラン名を取得
    const currentPlan = subscriptionPlans.find(
      (p) => p.id === resolvedPlanId || p.aliases?.includes(resolvedPlanId || '')
    );

    switch (resolvedPlanId) {
      case 'standard':
        return {
          name: currentPlan?.name || 'スタンダード',
          icon: Star,
          color: 'text-gray-400',
          bgColor: 'bg-gray-700',
          downloads: displayedRemaining,
          limit: planLimit
        };
      case 'pro':
        return {
          name: currentPlan?.name || 'プロ',
          icon: Zap,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-900',
          downloads: displayedRemaining,
          limit: planLimit
        };
      case 'business':
      case 'enterprise':
        return {
          name: currentPlan?.name || 'ビジネス',
          icon: Crown,
          color: 'text-purple-400',
          bgColor: 'bg-purple-900',
          downloads: displayedRemaining,
          limit: planLimit
        };
      default:
        return {
          name: '未登録',
          icon: Star,
          color: 'text-gray-500',
          bgColor: 'bg-gray-800',
          downloads: 0,
          limit: 0
        };
    }
  };

  const planInfo = getPlanInfo();

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#1a1a1a] border-r border-gray-800 p-4 gap-4">
      {/* ナビゲーション */}
      <button 
        onClick={() => onPageChange('dashboard')}
        className="w-full flex items-center justify-start transition-all duration-300 cursor-pointer border-none outline-none"
        style={{
          padding: '12px 15px',
          background: currentPage === 'dashboard' ? '#6b46c1' : 'transparent',
          borderRadius: '8px',
          color: currentPage === 'dashboard' ? '#fff' : '#999',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (currentPage !== 'dashboard') {
            e.currentTarget.style.background = '#333';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (currentPage !== 'dashboard') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#999';
          }
        }}
      >
        <Film className="w-4 h-4 mr-3" />
        ダッシュボード
      </button>
      
      <button 
        onClick={() => onPageChange('mypage')}
        className="w-full flex items-center justify-start transition-all duration-300 cursor-pointer border-none outline-none"
        style={{
          padding: '12px 15px',
          background: currentPage === 'mypage' ? '#6b46c1' : 'transparent',
          borderRadius: '8px',
          color: currentPage === 'mypage' ? '#fff' : '#999',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (currentPage !== 'mypage') {
            e.currentTarget.style.background = '#333';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (currentPage !== 'mypage') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#999';
          }
        }}>
        <User className="w-4 h-4 mr-3" />
        マイページ
      </button>
      
      <button 
        onClick={() => onPageChange('download-history')}
        className="w-full flex items-center justify-start transition-all duration-300 cursor-pointer border-none outline-none"
        style={{
          padding: '12px 15px',
          background: currentPage === 'download-history' ? '#6b46c1' : 'transparent',
          borderRadius: '8px',
          color: currentPage === 'download-history' ? '#fff' : '#999',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (currentPage !== 'download-history') {
            e.currentTarget.style.background = '#333';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (currentPage !== 'download-history') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#999';
          }
        }}>
        <History className="w-4 h-4 mr-3" />
        ダウンロード履歴
      </button>
      
      <button 
        onClick={() => onPageChange('favorites')}
        className="w-full flex items-center justify-start transition-all duration-300 cursor-pointer border-none outline-none"
        style={{
          padding: '12px 15px',
          background: currentPage === 'favorites' ? '#6b46c1' : 'transparent',
          borderRadius: '8px',
          color: currentPage === 'favorites' ? '#fff' : '#999',
          fontSize: '14px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (currentPage !== 'favorites') {
            e.currentTarget.style.background = '#333';
            e.currentTarget.style.color = '#fff';
          }
        }}
        onMouseLeave={(e) => {
          if (currentPage !== 'favorites') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#999';
          }
        }}>
        <Heart className="w-4 h-4 mr-3" />
        お気に入り
      </button>
      
      
      {isAdmin && (
        <button
          onClick={() => onPageChange('staging-review')}
          className="w-full flex items-center justify-start transition-all duration-300 cursor-pointer border-none outline-none"
          style={{
            padding: '12px 15px',
            background: currentPage === 'staging-review' ? '#2d6a4f' : 'transparent',
            borderRadius: '8px',
            color: currentPage === 'staging-review' ? '#fff' : '#999',
            fontSize: '14px',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (currentPage !== 'staging-review') {
              e.currentTarget.style.background = '#333';
              e.currentTarget.style.color = '#fff';
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage !== 'staging-review') {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#999';
            }
          }}
        >
          <Star className="w-4 h-4 mr-3" />
          動画承認
        </button>
      )}
      
      {/* プランアップグレード（ビジネス以外） */}
      {shouldShowUpgrade && (
        <button 
          onClick={() => onPageChange('pricing')}
          className="w-full p-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-start text-sm font-bold transition-all duration-300 hover:from-orange-600 hover:to-orange-700 hover:transform hover:-translate-y-0.5 hover:shadow-lg animate-pulse relative overflow-hidden my-2"
        >
          <span className="absolute left-4 text-base animate-spin-slow">⭐</span>
          <span className="ml-8">プランアップグレード</span>
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-bold animate-bounce">
            HOT!
          </span>
        </button>
      )}
      
      {/* プラン情報セクション */}
      <div className="mt-auto pt-4 border-t border-gray-700">
        {/* 現在のプラン */}
        <div className="mb-4 p-4 rounded-lg bg-gray-800 border border-gray-700">
          <div className="flex items-center mb-3">
            <div className={`p-2 rounded-lg ${planInfo.bgColor} mr-3`}>
              <planInfo.icon className={`w-5 h-5 ${planInfo.color}`} />
            </div>
            <div>
              <div className="text-xs text-gray-400">現在のプラン</div>
              <div className={`text-sm font-bold ${planInfo.color}`}>
                {planInfo.name}
              </div>
              {/* サブスクリプションステータス表示 */}
              {subscription && subscription.status && (
                <div className={`text-xs mt-0.5 ${
                  subscription.status === 'active' ? 'text-green-400' :
                  subscription.status === 'trial' ? 'text-yellow-400' :
                  subscription.status === 'canceled' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {subscription.status === 'active' ? '有効' :
                   subscription.status === 'trial' ? 'トライアル中' :
                   subscription.status === 'canceled' ? 'キャンセル済み' :
                   subscription.status === 'past_due' ? '支払い遅延' :
                   subscription.status}
                </div>
              )}
            </div>
          </div>

          {/* ダウンロード残数 */}
          {(resolvedPlanId || isTrialUser) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">今月の残り</span>
                <span className="text-white font-bold">
                  {planInfo.downloads}/{planInfo.limit}本
                </span>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    planInfo.downloads > planInfo.limit * 0.7 ? 'bg-green-500' :
                    planInfo.downloads > planInfo.limit * 0.3 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{
                    width: `${planInfo.limit > 0 ? (planInfo.downloads / planInfo.limit) * 100 : 0}%`
                  }}
                />
              </div>

              {/* 有効期限 */}
              {isTrialUser && planInfo.daysLeft !== undefined && (
                <div className="mt-2 text-xs text-gray-400">
                  有効期限: あと{planInfo.daysLeft}日
                </div>
              )}
            </div>
          )}

          {/* 未登録の場合のメッセージ */}
          {!resolvedPlanId && !isTrialUser && user && (
            <div className="text-xs text-gray-400 mt-2">
              プランを選択してダウンロードを開始
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;





