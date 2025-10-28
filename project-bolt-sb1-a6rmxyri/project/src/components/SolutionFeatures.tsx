import React from 'react';

const SolutionFeatures: React.FC = () => {
  const features = [
    {
      title: "実写級AI動画生成",
      description: "最新のAI技術により、実際の撮影と見分けがつかない高品質な動画を生成",
      benefits: ["撮影不要", "キャスティング不要", "場所を選ばない"],
      color: "from-blue-400 to-blue-600"
    },
    {
      title: "9:16縦型フォーマット",
      description: "Instagram、TikTok、YouTube Shortsに最適化された縦型動画",
      benefits: ["SNS完全対応", "高エンゲージメント", "モバイルファースト"],
      color: "from-purple-400 to-purple-600"
    },
    {
      title: "業界特化カテゴリ",
      description: "美容、フィットネス、ヘルスケア、ビジネスなど業界に特化した動画素材",
      benefits: ["ターゲット特化", "高CVR設計", "業界知見反映"],
      color: "from-cyan-400 to-cyan-600"
    },
    {
      title: "即座ダウンロード",
      description: "必要な動画をその場ですぐにダウンロード。待ち時間なしで即座利用開始",
      benefits: ["24時間利用可能", "高速配信", "複数形式対応"],
      color: "from-green-400 to-green-600"
    },
    {
      title: "最新技術の使用",
      description: "市場の変化に合わせて最新のAI技術を継続的に取り入れ、常に最高品質の動画素材を提供",
      benefits: ["最新AI技術", "継続的アップデート", "品質向上保証"],
      color: "from-pink-400 to-pink-600"
    },
    {
      title: "商用利用可能",
      description: "全ての動画素材は商用利用が可能。追加ライセンス料金は一切不要",
      benefits: ["完全買い切り", "著作権保護", "安心利用"],
      color: "from-orange-400 to-orange-600"
    }
  ];

  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              AI生成による
            </span>
            <br />
            高品質動画素材の提供
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            従来の制作課題を解決する、次世代の動画素材プラットフォーム
          </p>
        </div>

        {/* 機能グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105 h-full">
                {/* タイトル */}
                <h3 className="text-2xl font-bold text-white mb-6">
                  {feature.title}
                </h3>

                {/* 説明 */}
                <p className="text-gray-400 mb-6 leading-relaxed text-lg">
                  {feature.description}
                </p>

                {/* ベネフィット */}
                <div className="space-y-3">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 bg-gradient-to-r ${feature.color} rounded-full`}></div>
                      <span className="text-gray-300">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 動画仕様の説明 */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-600/10 rounded-3xl p-8 border border-yellow-500/20">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              📹 動画素材の仕様について
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">⏱️</span>
                  <h4 className="text-xl font-bold text-white">動画の長さ</h4>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  全ての動画素材は<span className="text-yellow-400 font-bold">約10秒の短尺動画</span>です。SNS広告やリール・ショート動画に最適な長さに設計されています。
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🔇</span>
                  <h4 className="text-xl font-bold text-white">音声について</h4>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  動画素材には<span className="text-yellow-400 font-bold">音声は含まれていません</span>。BGMやナレーションは編集時にお好みで追加できます。
                </p>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center mt-6">
              ※ 短尺・音声なしの仕様により、様々な用途に柔軟にカスタマイズして活用いただけます
            </p>
          </div>
        </div>

        {/* 統合メッセージ */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-3xl p-8 border border-blue-500/20">
            <h3 className="text-2xl font-bold text-white mb-4">
              すべてが統合された完全ソリューション
            </h3>
            <p className="text-gray-400 text-lg mb-6">
              企画から配信まで、動画マーケティングに必要な全てを一つのプラットフォームで
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-black text-blue-400 mb-2">1分</div>
                <div className="text-gray-400">動画選択〜ダウンロード</div>
              </div>
              <div>
                <div className="text-2xl font-black text-purple-400 mb-2">1000+</div>
                <div className="text-gray-400">豊富な動画ライブラリ</div>
              </div>
              <div>
                <div className="text-2xl font-black text-cyan-400 mb-2">24/7</div>
                <div className="text-gray-400">いつでもアクセス可能</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionFeatures;