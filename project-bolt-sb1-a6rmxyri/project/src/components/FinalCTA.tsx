import React from 'react';

interface FinalCTAProps {
  onTrialRequest: () => void;
  onContactRequest: () => void;
  onPurchaseRequest?: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onTrialRequest, onContactRequest, onPurchaseRequest }) => {
  const benefits = [
    {
      text: "クレジットカード安心決済"
    },
    {
      text: "いつでもキャンセル可能"
    },
    {
      text: "商用利用可能"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-900 via-purple-900 to-black relative overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          {/* メインタイトル */}
          <div className="mb-8">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                今すぐ実写級動画で競合に差をつけよう
              </span>
            </h2>
            <p className="text-xl sm:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              AI Creative Stockで動画マーケティングを革新し、
              <br className="hidden sm:block" />
              圧倒的な成果を手に入れてください
            </p>
          </div>

          {/* 特典リスト */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-10">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-green-400">
                <span className="font-semibold">{benefit.text}</span>
              </div>
            ))}
          </div>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={onPurchaseRequest || onTrialRequest}
              className="group bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-black text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-cyan-500/25 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10">
                今すぐ始める
              </span>
            </button>

            <button
              onClick={onTrialRequest}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-green-500/25"
            >
              AI動画素材を見る
            </button>
          </div>
          

          {/* 緊急性の演出 */}
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl p-6 border border-orange-500/30 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-orange-400 mb-2">
              ⚡ 今すぐ行動する理由
            </h3>
            <p className="text-gray-300">
              競合がまだAI動画を活用していない今がチャンス。
              <br />
              先行者利益で市場をリードしませんか？
            </p>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-black text-cyan-400 mb-2">1000+</div>
              <div className="text-gray-400">満足いただいているお客様</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-purple-400 mb-2">2.4倍</div>
              <div className="text-gray-400">平均CVR向上実績</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-green-400 mb-2">90%</div>
              <div className="text-gray-400">コスト削減効果</div>
            </div>
          </div>

          {/* 安心メッセージ */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 text-sm">
              💳 クレジットカード情報は安全に暗号化されます<br />
              📞 専門サポートチームが導入をサポート<br />
              🔒 いつでもキャンセル可能・違約金なし
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
