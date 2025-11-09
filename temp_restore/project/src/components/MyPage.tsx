import React, { useState } from 'react';
import { User, Crown, Calendar, Download, TrendingUp, AlertTriangle, CheckCircle, X, CreditCard, Shield, Zap } from 'lucide-react';

const MyPage: React.FC = () => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  // ユーザーの現在のプラン情報（デモデータ）
  const currentPlan = {
    name: 'プロ',
    price: 49800,
    downloadsPerMonth: 30,
    remainingDownloads: 18,
    nextBillingDate: '2024-02-20',
    isActive: true
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

  const handleCancel = () => {
    // 実際のアプリケーションでは、ここでサーバーに解約リクエストを送信
    alert('プランを解約しました。残りのダウンロード数は0になります。');
    setShowCancelModal(false);
  };

  const handleUpgrade = () => {
    // 実際のアプリケーションでは、ここでアップグレード処理
    alert('プレミアムプランにアップグレードしました。');
    setShowUpgradeModal(false);
  };

  const handleDowngrade = () => {
    // 実際のアプリケーションでは、ここでダウングレード処理
    alert('スタンダードプランにダウングレードしました。次回請求日から適用されます。');
    setShowDowngradeModal(false);
  };

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
            <span className="gradient-text">マイページ</span>
          </h1>
          <p className="text-lg text-gray-400">
            アカウント情報と料金プランの管理
          </p>
        </div>

        {/* ユーザー情報 */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">田中太郎</h2>
              <p className="text-gray-400">tanaka@gmail.com</p>
              <div className="flex items-center space-x-2 mt-2">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-xs text-gray-500">Googleアカウント連携済み</span>
              </div>
            </div>
          </div>
        </div>

        {/* 現在のプラン情報 */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Crown className="w-6 h-6 text-cyan-400" />
            <span>現在の料金プラン</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* プラン詳細 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">プラン名</span>
                <div className="flex items-center space-x-2">
                  <span className="text-white font-bold text-lg">{currentPlan.name}</span>
                  <div className="glass-effect px-3 py-1 rounded-full border border-cyan-400/30 text-cyan-400 text-sm">
                    アクティブ
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">月額料金</span>
                <span className="text-white font-bold text-lg">{formatPrice(currentPlan.price)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">次回請求日</span>
                <span className="text-white font-medium">{formatDate(currentPlan.nextBillingDate)}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => setShowUpgradeModal(true)}
              className="cyber-button text-white py-3 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
            >
              <TrendingUp className="w-5 h-5" />
              <span>アップグレード</span>
            </button>
            
            <button 
              onClick={() => setShowDowngradeModal(true)}
              className="glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-6 rounded-xl transition-all duration-300 font-bold hover:bg-white/5 flex items-center justify-center space-x-2"
            >
              <TrendingUp className="w-5 h-5 rotate-180" />
              <span>ダウングレード</span>
            </button>
            
            <button 
              onClick={() => setShowCancelModal(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-xl transition-all duration-300 font-bold flex items-center justify-center space-x-2"
            >
              <X className="w-5 h-5" />
              <span>解約</span>
            </button>
          </div>
        </div>

        {/* 利用統計 */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Download className="w-6 h-6 text-purple-400" />
            <span>利用統計</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">127</h4>
              <p className="text-gray-400 text-sm">総ダウンロード数</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">8</h4>
              <p className="text-gray-400 text-sm">利用月数</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-2xl font-black text-white mb-2">4.8</h4>
              <p className="text-gray-400 text-sm">平均評価</p>
            </div>
          </div>
        </div>
      </div>

      {/* 解約確認モーダル */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">プランを解約しますか？</h3>
              <p className="text-gray-400 text-sm">
                解約すると即座に残りのダウンロード数が0になり、動画をダウンロードできなくなります。
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl transition-all font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-4 rounded-xl font-bold transition-all"
              >
                解約する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アップグレード確認モーダル */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">プレミアムプランにアップグレード</h3>
              <p className="text-gray-400 text-sm mb-4">
                月50本のダウンロードと追加機能をご利用いただけます。
              </p>
              <div className="text-2xl font-bold text-white">
                {formatPrice(79800)}/月
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl transition-all font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 cyber-button text-white py-3 px-4 rounded-xl font-bold transition-all"
              >
                アップグレード
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ダウングレード確認モーダル */}
      {showDowngradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDowngradeModal(false)} />
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white rotate-180" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">スタンダードプランにダウングレード</h3>
              <p className="text-gray-400 text-sm mb-4">
                月10本のダウンロードになります。次回請求日から適用されます。
              </p>
              <div className="text-2xl font-bold text-white">
                {formatPrice(29800)}/月
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDowngradeModal(false)}
                className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl transition-all font-bold"
              >
                キャンセル
              </button>
              <button
                onClick={handleDowngrade}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 px-4 rounded-xl font-bold transition-all"
              >
                ダウングレード
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPage;