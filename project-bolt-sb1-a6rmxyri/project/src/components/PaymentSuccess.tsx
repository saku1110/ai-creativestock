import React, { useEffect, useState } from 'react';
import { CheckCircle, Download, ArrowRight } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';

const PaymentSuccess: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const { user, refreshUserData } = useUser();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      try {
        // URLからセッションIDとプランIDを取得
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        const planIdFromUrl = urlParams.get('plan_id');

        if (!sessionId || !user) {
          setLoading(false);
          return;
        }

        // Meta Pixel 購入コンバージョンイベント送信（URLパラメータから即座に送信）
        const planPrices: Record<string, number> = {
          standard: 1980,
          pro: 3980,
          business: 9800
        };
        const planId = planIdFromUrl || 'standard';

        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: planPrices[planId] || 0,
            currency: 'JPY',
            content_name: planId,
            content_type: 'product',
            content_ids: [planId],
          });
          console.log('[Meta Pixel] Purchase event sent:', planId);
        }

        // 決済情報の確認とサブスクリプション情報の更新
        await new Promise(resolve => setTimeout(resolve, 2000)); // Webhookの処理完了を待機

        // ユーザーデータを更新
        await refreshUserData();

        // サブスクリプション情報を取得（UI表示用）
        const { data: subscription } = await database.getUserSubscription(user.id);
        setSubscriptionData(subscription);

      } catch (error) {
        console.error('Payment success handling error:', error);
      } finally {
        setLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [user, refreshUserData]);

  const handleContinue = () => {
    window.location.href = '/dashboard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">決済情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* 成功アイコン */}
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-16 h-16 text-white" />
        </div>

        {/* メインメッセージ */}
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-6">
          <span className="gradient-text">お支払い完了！</span>
        </h1>

        <p className="text-xl text-gray-400 mb-8">
          ありがとうございます！サブスクリプションの購入が正常に完了しました。
        </p>

        {/* サブスクリプション詳細 */}
        {subscriptionData && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              プラン詳細
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-400">プラン</p>
                <p className="text-white font-semibold capitalize">{subscriptionData.plan}</p>
              </div>
              <div>
                <p className="text-gray-400">月間ダウンロード数</p>
                <p className="text-white font-semibold">{subscriptionData.monthly_download_limit}本</p>
              </div>
              <div>
                <p className="text-gray-400">次回請求日</p>
                <p className="text-white font-semibold">
                  {new Date(subscriptionData.current_period_end).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <div>
                <p className="text-gray-400">ステータス</p>
                <p className="text-green-400 font-semibold">有効</p>
              </div>
            </div>
          </div>
        )}

        {/* 次のステップ */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            今すぐできること
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-start space-x-3">
              <Download className="w-5 h-5 text-cyan-400" />
              <span className="text-gray-300">動画ライブラリから高品質な動画をダウンロード</span>
            </div>
            <div className="flex items-center justify-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-gray-300">カテゴリ別でお探しの動画を検索</span>
            </div>
            <div className="flex items-center justify-start space-x-3">
              <ArrowRight className="w-5 h-5 text-purple-400" />
              <span className="text-gray-300">マイページで使用状況を確認</span>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <button
            onClick={handleContinue}
            className="w-full sm:w-auto cyber-button text-white py-4 px-8 text-lg font-bold hover:scale-105 transition-transform"
          >
            動画ライブラリへ
          </button>
          <button
            onClick={() => window.location.href = '/mypage'}
            className="w-full sm:w-auto glass-effect border border-white/20 text-gray-300 hover:text-white py-4 px-8 text-lg font-bold transition-all hover:border-white/40"
          >
            マイページ
          </button>
        </div>

        {/* お困りの場合 */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">
            何かお困りのことがございましたら、お気軽にお問い合わせください。
          </p>
          <button className="text-cyan-400 hover:text-cyan-300 transition-colors underline">
            サポートに連絡
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;