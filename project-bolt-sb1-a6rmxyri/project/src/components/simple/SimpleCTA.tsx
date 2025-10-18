import React from 'react';
import { Shield, Award, Clock } from 'lucide-react';

interface SimpleCTAProps {
  onAuthRequest: () => void;
}

const SimpleCTA: React.FC<SimpleCTAProps> = ({ onAuthRequest }) => {
  return (
    <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          今すぐ動画マーケティングを革新しませんか？
        </h2>
        
        <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          AI動画素材一覧を見るから、10,000社以上が体験した成果をご確認ください
        </p>

        {/* 限定オファー */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-8 max-w-xl mx-auto">
          <p className="text-yellow-300 font-semibold mb-2">
            🎁 期間限定オファー
          </p>
          <p className="text-white">
            今なら年額プランが最大40%OFF + 初月特別割引
          </p>
          <p className="text-white/80 text-sm mt-2">
            ※このオファーは予告なく終了する場合があります
          </p>
        </div>

        {/* CTAボタン */}
        <button
          onClick={onAuthRequest}
          className="bg-white text-indigo-600 px-12 py-5 rounded-xl font-bold text-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl mb-6"
        >
          AI動画素材一覧を見る
        </button>

        <p className="text-white/80 text-sm mb-12">
          クレジットカード登録不要・いつでも解約可能
        </p>

        {/* 信頼バッジ */}
        <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
          <div className="flex items-center text-white/90">
            <Shield className="w-5 h-5 mr-2" />
            <span>SSL暗号化</span>
          </div>
          <div className="flex items-center text-white/90">
            <Award className="w-5 h-5 mr-2" />
            <span>返金保証</span>
          </div>
          <div className="flex items-center text-white/90">
            <Clock className="w-5 h-5 mr-2" />
            <span>24時間サポート</span>
          </div>
        </div>

        {/* 緊急性の演出 */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-lg p-4 inline-block">
          <p className="text-white font-medium">
            🔥 現在<span className="text-yellow-300 font-bold mx-1">237名</span>が閲覧中
          </p>
        </div>
      </div>
    </section>
  );
};

export default SimpleCTA;
