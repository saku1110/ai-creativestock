import React from 'react';
import { X, ArrowLeft, CreditCard } from 'lucide-react';

const PaymentCancel: React.FC = () => {
  const handleRetryPayment = () => {
    window.location.href = '/pricing';
  };

  const handleBackToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* キャンセルアイコン */}
        <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-8">
          <X className="w-16 h-16 text-gray-400" />
        </div>

        {/* メインメッセージ */}
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-6">
          お支払いが<span className="text-gray-500">キャンセル</span>されました
        </h1>

        <p className="text-xl text-gray-400 mb-8">
          決済処理がキャンセルされました。いつでも再度お試しいただけます。
        </p>

        {/* 説明 */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            何が起こったのでしょうか？
          </h2>
          <div className="text-left text-gray-300 space-y-3">
            <p>• 決済画面で「戻る」ボタンを押された</p>
            <p>• ブラウザを閉じられた</p>
            <p>• 決済情報の入力を中断された</p>
            <p>• ネットワーク接続に問題があった</p>
          </div>
        </div>

        {/* プラン再確認 */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            AI Creative Stockの特徴
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="space-y-2">
              <p className="text-cyan-400 font-semibold">高品質な動画素材</p>
              <p className="text-gray-400 text-sm">10秒のプロ仕様AI動画</p>
            </div>
            <div className="space-y-2">
              <p className="text-green-400 font-semibold">商用利用可能</p>
              <p className="text-gray-400 text-sm">安心の商用ライセンス</p>
            </div>
            <div className="space-y-2">
              <p className="text-purple-400 font-semibold">カテゴリ豊富</p>
              <p className="text-gray-400 text-sm">美容・フィットネス等</p>
            </div>
            <div className="space-y-2">
              <p className="text-orange-400 font-semibold">いつでもキャンセル</p>
              <p className="text-gray-400 text-sm">月単位で柔軟に管理</p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <button
            onClick={handleRetryPayment}
            className="w-full sm:w-auto cyber-button text-white py-4 px-8 text-lg font-bold hover:scale-105 transition-transform flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>再度お支払い手続きへ</span>
          </button>
          <button
            onClick={handleBackToDashboard}
            className="w-full sm:w-auto glass-effect border border-white/20 text-gray-300 hover:text-white py-4 px-8 text-lg font-bold transition-all hover:border-white/40 flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>ダッシュボードへ戻る</span>
          </button>
        </div>

        {/* サポート情報 */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">
            お支払いでお困りのことがございましたら、お気軽にサポートまでご連絡ください。
          </p>
          <div className="space-y-2">
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors underline block mx-auto">
              よくある質問を見る
            </button>
            <button className="text-cyan-400 hover:text-cyan-300 transition-colors underline block mx-auto">
              サポートに連絡
            </button>
          </div>
        </div>

        {/* セキュリティ情報 */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            🔒 SSL暗号化により、お客様の決済情報は安全に保護されています
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;