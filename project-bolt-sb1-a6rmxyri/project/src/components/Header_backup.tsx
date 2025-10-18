import React, { useState, useEffect } from 'react';
import { User, Zap, LayoutDashboard, UserCircle, Heart, Crown, Download, LogOut } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useUser } from '../hooks/useUser';
import { useAdmin } from '../hooks/useAdmin';
import UpgradePromptModal from './UpgradePromptModal';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isLoggedIn: boolean;
  onAuthRequest: () => void;
  onTrialRequest: () => void;
  onLogout: () => void;
  userData?: SupabaseUser;
}

const Header: React.FC<HeaderProps> = ({ 
  currentPage, 
  onPageChange, 
  isLoggedIn, 
  onAuthRequest, 
  onTrialRequest,
  onLogout, 
  userData 
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { profile, isTrialUser, trialDaysRemaining, trialDownloadsRemaining } = useUser();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const displayName = profile?.name || userData?.user_metadata?.full_name || userData?.user_metadata?.name || userData?.email?.split('@')[0] || 'ユーザー';
  const userAvatar = profile?.avatar_url || userData?.user_metadata?.avatar_url || userData?.user_metadata?.picture;

  // ユーザーメニューを閉じる
  const closeUserMenu = () => setIsUserMenuOpen(false);

  // ページ変更時にメニューを閉じる
  const handlePageChange = (page: string) => {
    onPageChange(page);
    closeUserMenu();
  };

  // クリック外でメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isUserMenuOpen && !(event.target as Element).closest('.user-menu')) {
        closeUserMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  return (
    <header className="glass-dark border-b border-white/10 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* ロゴ */}
          <div className="flex items-center flex-shrink-0">
            <button 
              onClick={() => onPageChange(isLoggedIn ? 'dashboard' : 'landing')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center animate-glow">
                  <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="ml-2 sm:ml-3">
                <h1 className="text-sm sm:text-xl lg:text-2xl font-bold gradient-text whitespace-nowrap">
                  AI Creative Stock
                </h1>
                <p className="text-xs text-gray-400 -mt-1 hidden sm:block lg:block">Creative Video Assets</p>
              </div>
            </button>
          </div>

          {/* 右側の要素をまとめる */}
          {isLoggedIn ? (
            <div className="flex items-center space-x-4">
              {/* デスクトップナビゲーション */}
              <nav className="hidden lg:flex items-center space-x-2">
                <button 
                  onClick={() => onPageChange('dashboard')}
                  className={`flex items-center space-x-2 text-gray-300 hover:text-cyan-400 transition-all duration-300 font-medium px-4 py-2 rounded-xl ${
                    currentPage === 'dashboard' ? 'text-cyan-400 bg-cyan-400/10' : ''
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>ダッシュボード</span>
                </button>
                
              </nav>
              
              {/* ユーザーメニュー - デスクトップとモバイル両方対応 */}
              <div className="user-menu relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 hover:bg-white/10 rounded-lg p-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden">
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // 画像読み込みエラー時はデフォルトアイコンを表示
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center ${userAvatar ? 'hidden' : ''}`}>
                      <User className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-300">{displayName}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* ユーザードロップダウンメニュー */}
                {isUserMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-black/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-2xl z-50 lg:w-64 max-w-sm">
                    <div className="p-4">
                      {/* ユーザー情報 */}
                      <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl mb-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden">
                          {userAvatar ? (
                            <img 
                              src={userAvatar} 
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center ${userAvatar ? 'hidden' : ''}`}>
                            <User className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{displayName}</div>
                          <div className="text-gray-400 text-sm">サブスクリプション会員</div>
                        </div>
                      </div>

                      {/* メニュー項目 */}
                      <div className="space-y-1">
                        <button 
                          onClick={() => handlePageChange('mypage')}
                          className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            currentPage === 'mypage' ? 'bg-cyan-400/10 text-cyan-400' : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <UserCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">マイページ</span>
                        </button>

                        <button 
                          onClick={() => handlePageChange('download-history')}
                          className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            currentPage === 'download-history' ? 'bg-blue-400/10 text-blue-400' : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">ダウンロード履歴</span>
                        </button>

                        <button 
                          onClick={() => handlePageChange('favorites')}
                          className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            currentPage === 'favorites' ? 'bg-pink-400/10 text-pink-400' : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-sm font-medium">お気に入り</span>
                        </button>

                        <button 
                          onClick={() => handlePageChange('pricing')}
                          className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 ${
                            currentPage === 'pricing' ? 'bg-purple-400/10 text-purple-400' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-400/10'
                          }`}
                        >
                          <Zap className="w-4 h-4" />
                          <span className="text-sm font-medium">プランアップグレード</span>
                        </button>


                        {/* モバイル表示用の追加メニュー */}
                        <div className="lg:hidden space-y-1 mt-2 pt-2 border-t border-white/10">
                          <button 
                            onClick={() => handlePageChange('dashboard')}
                            className={`flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 ${
                              currentPage === 'dashboard' ? 'bg-cyan-400/10 text-cyan-400' : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="text-sm font-medium">ダッシュボード</span>
                          </button>
                        </div>

                        {/* 区切り線 */}
                        <div className="border-t border-white/10 my-2"></div>

                        {/* ログアウト */}
                        <button 
                          onClick={onLogout}
                          className="flex items-center space-x-3 w-full text-left p-3 rounded-lg transition-all duration-200 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm font-medium">ログアウト</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button 
                onClick={onAuthRequest}
                className="text-gray-300 hover:text-white transition-colors font-medium px-3 sm:px-4 py-2 rounded-xl text-sm sm:text-base"
              >
                ログイン
              </button>
              <button 
                onClick={onTrialRequest}
                className="cyber-button text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 text-sm sm:text-base"
              >
                新規登録
              </button>
            </div>
          )}
        </div>
      </div>

      {/* アップグレードモーダル */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeSuccess={() => {
          setShowUpgradeModal(false);
          window.location.reload();
        }}
        trialDaysRemaining={trialDaysRemaining}
        downloadsRemaining={trialDownloadsRemaining}
        reason="limit_reached"
      />
    </header>
  );
};

export default Header;
