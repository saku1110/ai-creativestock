import React from 'react';

interface VideoRequestSectionProps {
  onTrialRequest: () => void;
}

const VideoRequestSection: React.FC<VideoRequestSectionProps> = ({ onTrialRequest }) => {
  const requestExamples = [
    {
      industry: "美容・コスメ",
      icon: "💄",
      examples: ["20代女性のスキンケア動画", "オーラルケア商品の使用シーン", "ヘアケア Before/After"]
    },
    {
      industry: "フィットネス",
      icon: "💪",
      examples: ["ジムでのトレーニング風景", "ヨガ・ストレッチ動画", "プロテイン摂取シーン"]
    },
    {
      industry: "健康食品",
      icon: "🥗",
      examples: ["サプリメント服用シーン", "スムージー作り", "健康的な食事風景"]
    },
    {
      industry: "アパレル",
      icon: "👗",
      examples: ["コーディネート紹介", "着回しシーン", "季節別ファッション"]
    },
    {
      industry: "マッチングアプリ",
      icon: "💑",
      examples: ["デート前の準備シーン", "カフェでの会話", "アプリ使用シーン"]
    },
    {
      industry: "EC・通販",
      icon: "📦",
      examples: ["ビフォー動画（使用前）", "アフター動画（使用後）", "10秒の短尺訴求動画"]
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold">
              カスタマイズ可能
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-pink-400 to-orange-500 bg-clip-text text-transparent">
              あなたの業種・商品に合った
            </span>
            <br />
            動画素材をリクエスト
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            欲しい動画が見つからない？ご安心ください。<br />
            年齢・性別・シーン・背景など、細かい条件を指定してリクエストできます。
          </p>
        </div>

        {/* リクエスト例グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {requestExamples.map((item, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-pink-500/50 transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">{item.icon}</span>
                <h3 className="text-xl font-bold text-white">{item.industry}</h3>
              </div>
              <ul className="space-y-2">
                {item.examples.map((example, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-pink-400 mt-1">✓</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* リクエスト機能の特徴 */}
        <div className="bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-3xl p-8 border border-pink-500/20 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h4 className="text-white font-bold mb-2">細かい指定が可能</h4>
              <p className="text-gray-400 text-sm">年齢・性別・体型・背景・シーンなど詳細に指定できます</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="text-white font-bold mb-2">スピード対応</h4>
              <p className="text-gray-400 text-sm">リクエストから通常2-3営業日で動画を追加</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎬</div>
              <h4 className="text-white font-bold mb-2">プロ品質</h4>
              <p className="text-gray-400 text-sm">実写級のクオリティでビジネス利用に最適</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h4 className="text-white font-bold mb-2">プランに応じて利用可能</h4>
              <p className="text-gray-400 text-sm">各プランごとに月間リクエスト数が設定されています</p>
            </div>
          </div>
        </div>

        {/* リクエスト例のステップ */}
        <div className="bg-gray-800/50 rounded-2xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            リクエスト例：健康食品メーカー様の場合
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="bg-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4">1</div>
              <h4 className="text-white font-bold mb-3">詳細を指定</h4>
              <div className="text-gray-300 text-sm space-y-2">
                <p>• 年齢：40代女性</p>
                <p>• シーン：朝食時のサプリ摂取</p>
                <p>• 背景：明るいキッチン</p>
                <p>• 表情：笑顔で健康的</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="bg-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4">2</div>
              <h4 className="text-white font-bold mb-3">AI生成開始</h4>
              <p className="text-gray-300 text-sm">
                ご指定いただいた条件をもとに、プロのクリエイターがAI動画を生成。品質チェック後、ライブラリに追加されます。
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="bg-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4">3</div>
              <h4 className="text-white font-bold mb-3">ダウンロード</h4>
              <p className="text-gray-300 text-sm">
                2-3営業日後、ダッシュボードから通知。即座にダウンロードして広告クリエイティブに活用できます。
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onTrialRequest}
            className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-12 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-pink-500/50"
          >
            今すぐ始めて動画をリクエストする
          </button>
          <p className="text-gray-400 text-sm mt-4">
            ※ 月間リクエスト数はプランによって異なります。詳しくは料金プランをご確認ください。
          </p>
        </div>
      </div>
    </section>
  );
};

export default VideoRequestSection;
