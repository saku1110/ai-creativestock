import React from 'react';

const EfficiencyStats: React.FC = () => {
  const stats = [
    {
      value: "1/10",
      label: "制作時間短縮",
      description: "従来2-4週間 → 即座に利用開始",
      color: "from-blue-400 to-blue-600"
    },
    {
      value: "90%",
      label: "コスト削減",
      description: "月額14,800円〜で月20本利用可能",
      color: "from-green-400 to-green-600"
    },
    {
      value: "3倍",
      label: "CVR向上",
      description: "業界特化設計で高いコンバージョン",
      color: "from-purple-400 to-purple-600"
    },
    {
      value: "300本",
      label: "毎月新規追加",
      description: "常に最新トレンドに対応",
      color: "from-cyan-400 to-cyan-600"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            圧倒的な
            <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              効率性と成果
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            AI Creative Stockで実現できる具体的な改善効果
          </p>
        </div>

        {/* 統計グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105">
                {/* 数値 */}
                <div className={`text-5xl sm:text-6xl font-black mb-4 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>

                {/* ラベル */}
                <div className="text-xl font-bold text-white mb-3">
                  {stat.label}
                </div>

                {/* 説明 */}
                <div className="text-gray-400 leading-relaxed">
                  {stat.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EfficiencyStats;
