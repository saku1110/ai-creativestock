import React, { useState } from 'react';
import { Search, ShoppingCart, User, Menu, X, Bell, Heart, Zap, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isLoggedIn: boolean;
  onAuthRequest: () => void;
  onLogout: () => void;
  userData?: any;
}

const Header: React.FC<HeaderProps> = ({ 
  currentPage, 
  onPageChange, 
  isLoggedIn, 
  onAuthRequest, 
  onLogout, 
  userData 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const displayName = userData?.name || '田中太郎';
  const userAvatar = userData?.picture;
  return (
    <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* ロゴ */}
          <div className="flex items-center flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center animate-glow">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-bold gradient-text whitespace-nowrap">
                  AI Creative Stock
                </h1>
                <p className="text-xs text-gray-400 -mt-1 hidden lg:block">Creative Video Assets</p>
              </div>
            </div>
          </div>

          {/* デスクトップナビゲーション */}
          <nav className="hidden xl:flex space-x-6">
            {(isLoggedIn 
              ? ['ホーム', '素材を探す', 'ダッシュボード', 'カテゴリー', '料金プラン'] 
              : ['ホーム', '素材を探す', 'カテゴリー', '料金プラン']
            ).map((item) => (
              <button 
                key={item} 
                onClick={() => {
                  if (item === 'ホーム') onPageChange('home');
                  else if (item === 'ダッシュボード') onPageChange('dashboard');
                  // 他のページも必要に応じて追加
                }}
                className={`text-gray-300 hover:text-cyan-400 transition-all duration-300 font-medium relative group whitespace-nowrap ${
                  (item === 'ダッシュボード' && currentPage === 'dashboard') || 
                  (item === 'ホーム' && currentPage === 'home') ? 'text-cyan-400' : ''
              }`}>
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-600 transition-all group-hover:w-full"></span>
              </button>
            ))}
          </nav>

          {/* 検索バー */}

          {/* ユーザーアクション */}
          <div className="flex items-center space-x-2 lg:space-x-3">
            {/* ダッシュボードボタン（ログイン時のみ） */}
            {isLoggedIn && (
              <button 
                onClick={() => onPageChange('dashboard')}
                className={`relative p-2 lg:p-3 transition-all duration-300 hover:bg-white/5 rounded-xl ${
                  currentPage === 'dashboard' ? 'text-cyan-400' : 'text-gray-400 hover:text-cyan-400'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            )}

            {/* ログイン・登録ボタン */}
            <div className="hidden md:flex items-center space-x-3">
              {isLoggedIn ? (
                <div>
                  <button 
                    onClick={() => onPageChange('mypage')}
                    className="flex items-center space-x-2 hover:bg-white/5 rounded-xl p-2 transition-all duration-300"
                  >
                    {userAvatar ? (
                      <img 
                        src={userAvatar} 
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <span className="text-white font-medium text-sm lg:text-base">{displayName}</span>
                  </button>
                  <button 
                    onClick={onLogout}
                    className="text-gray-300 hover:text-cyan-400 font-medium transition-all duration-300 text-sm lg:text-base whitespace-nowrap"
                  >
                    ログアウト
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={onAuthRequest}
                    className="flex items-center space-x-2 glass-effect border border-white/20 text-white hover:text-cyan-400 px-4 lg:px-6 py-2 lg:py-3 rounded-xl font-semibold transition-all duration-300 text-sm lg:text-base whitespace-nowrap hover:bg-white/5"
                  >
                    <User className="w-4 h-4" />
                    <span>新規登録・ログイン</span>
                  </button>
                </>
              )}
            </div>

            {/* モバイルメニューボタン */}
            <button
              className="xl:hidden p-2 lg:p-3 text-gray-400 hover:text-cyan-400 transition-colors ml-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="xl:hidden py-6 border-t border-white/10 animate-slide-up">
            <div className="space-y-6">
              {/* モバイル検索 */}

              {/* モバイルナビゲーション */}
              <nav className="flex flex-col space-y-4">
                {(isLoggedIn 
                  ? ['ホーム', '素材を探す', 'ダッシュボード', 'カテゴリー', '料金プラン'] 
                  : ['ホーム', '素材を探す', 'カテゴリー', '料金プラン']
                ).map((item) => (
                  <button 
                    key={item} 
                    onClick={() => {
                      if (item === 'ホーム') onPageChange('home');
                      else if (item === 'ダッシュボード') onPageChange('dashboard');
                      setIsMenuOpen(false);
                    }}
                    className={`text-gray-300 hover:text-cyan-400 transition-colors font-medium py-2 text-left w-full ${
                      (item === 'ダッシュボード' && currentPage === 'dashboard') || 
                      (item === 'ホーム' && currentPage === 'home') ? 'text-cyan-400' : ''
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </nav>

              {/* モバイルログイン・登録 */}
              <div className="flex flex-col space-y-3 pt-4 border-t border-white/10 md:hidden">
                {isLoggedIn ? (
                  <>
                    <button 
                      onClick={() => {
                        onPageChange('mypage');
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-300 w-full text-left"
                    >
                      {userAvatar ? (
                        <img 
                          src={userAvatar} 
                          alt={displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-white font-medium">{displayName}</span>
                    </button>
                    <button 
                      onClick={onLogout}
                      className="text-gray-300 hover:text-cyan-400 font-medium transition-colors text-left"
                    >
                      ログアウト
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={onAuthRequest}
                      className="flex items-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5"
                    >
                      <User className="w-5 h-5" />
                      <span>新規登録・ログイン</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;