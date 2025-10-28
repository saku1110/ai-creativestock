import React from 'react';

const ProblemMetrics: React.FC = () => {
  const problems = [
    {
      metric: "30万円+",
      description: "月間動画制作コスト",
      detail: "撮影・編集・キャスティング費用",
      color: "text-red-400"
    },
    {
      metric: "2-4週間",
      description: "制作期間",
      detail: "企画から完成まで",
      color: "text-orange-400"
    },
    {
      metric: "2.06%",
      description: "平均CVR",
      detail: "従来の動画広告",
      color: "text-yellow-400"
    },
    {
      metric: "60%",
      description: "素材不足",
      detail: "マーケターの悩み",
      color: "text-purple-400"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            動画素材
            <span className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
              足りてますか？
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            多くの企業が直面している動画マーケティングの現実
          </p>
        </div>

        {/* 問題指標 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {problems.map((problem, index) => (
            <div key={index} className="text-center group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105">
                <div className={`text-3xl sm:text-4xl font-black mb-4 ${problem.color}`}>
                  {problem.metric}
                </div>
                <div className="text-gray-300 font-semibold mb-2 text-lg">
                  {problem.description}
                </div>
                <div className="text-sm text-gray-500">
                  {problem.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 問題の深掘り */}
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-3xl p-8 border border-red-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <h3 className="text-2xl font-bold text-white mb-4">
                従来の動画制作の課題
              </h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>高額な制作費用（撮影・編集・キャスティング）</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>長期間の制作スケジュール</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>品質のバラつき</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>急なマーケティング施策に対応できない</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">✗</span>
                  <span>A/Bテスト用の複数素材制作困難</span>
                </li>
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                <div className="text-4xl font-black text-red-400 mb-2">89%</div>
                <div className="text-white font-semibold mb-2">のマーケター</div>
                <div className="text-gray-400 text-sm">
                  「動画素材不足で<br />機会損失を経験」
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemMetrics;
