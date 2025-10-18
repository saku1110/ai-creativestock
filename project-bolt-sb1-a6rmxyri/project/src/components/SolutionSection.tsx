import React from 'react';
import { Zap, DollarSign, TrendingUp, Smartphone, TestTube, Cpu } from 'lucide-react';

interface SolutionSectionProps {
  onAuthRequest: () => void;
  onContactRequest: () => void;
}

const SolutionSection: React.FC<SolutionSectionProps> = ({ onAuthRequest, onContactRequest }) => {
  const solutions = [
    {
      icon: Zap,
      title: '実写級の高品質動画が即利用可能',
      description: 'ダウンロードしてすぐに広告配信開始',
      color: 'from-cyan-400 to-blue-600'
    },
    {
      icon: Cpu,
      title: '最新の生成AI技術を使用',
      description: '最先端のAI技術による高品質動画生成',
      color: 'from-purple-400 to-pink-600'
    },
    {
      icon: DollarSign,
      title: 'コスト削減',
      description: '年額プランなら月9,800円で月20本から利用可能',
      color: 'from-green-400 to-emerald-600'
    },
    {
      icon: TrendingUp,
      title: '成約率最適化',
      description: '広告運用データに基づく高成約率素材',
      color: 'from-orange-400 to-red-600'
    },
    {
      icon: Smartphone,
      title: 'SNS最適化',
      description: 'TikTok・Instagram・YouTube Shorts対応',
      color: 'from-blue-400 to-indigo-600'
    },
    {
      icon: TestTube,
      title: 'A/Bテスト対応',
      description: '複数パターンで効果検証',
      color: 'from-pink-400 to-purple-600'
    }
  ];

  const comparisonData = [
    {
      metric: '制作期間',
      before: '5日',
      after: '即座'
    },
    {
      metric: '費用',
      before: '1万円/本',
      after: '740円/本'
    },
    {
      metric: '成約率',
      before: '1.2%',
      after: '3.8%'
    },
    {
      metric: 'A/Bテスト',
      before: '困難',
      after: '簡単'
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            AIが<span className="gradient-text">広告成約率向上</span>の<br className="sm:hidden" />全てを解決
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            従来の課題を一挙に解決する、革新的なAI動画素材サービス
          </p>
        </div>

        {/* ソリューション一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {solutions.map((solution, index) => {
            const IconComponent = solution.icon;
            return (
              <div key={index} className="glass-effect rounded-2xl p-6 sm:p-8 border border-cyan-600/20 hover-lift bg-gray-800/50">
                <div className={`w-16 h-16 bg-gradient-to-br ${solution.color} rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-glow`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {solution.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{solution.description}</p>
              </div>
            );
          })}
        </div>

        {/* Before/After比較表 */}
        <div className="glass-effect rounded-3xl p-8 sm:p-12 border border-cyan-600/30 shadow-2xl bg-gray-800/50">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
            Before / After 比較
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">項目</th>
                  <th className="text-center py-4 px-4 text-red-400 font-bold">従来の方法</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-bold">当サービス</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-6 px-4 text-white font-medium">{row.metric}</td>
                    <td className="py-6 px-4 text-center">
                      <span className="glass-effect bg-red-500/10 border border-red-400/30 text-red-400 px-4 py-2 rounded-xl font-bold">
                        {row.before}
                      </span>
                    </td>
                    <td className="py-6 px-4 text-center">
                      <span className="glass-effect bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 px-4 py-2 rounded-xl font-bold">
                        {row.after}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-center mt-8 sm:mt-12">
            <button 
              onClick={onAuthRequest}
              className="cyber-button text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 text-base sm:text-lg"
            >
              今すぐ効果を実感する
            </button>
            <button 
              onClick={onContactRequest}
              className="ml-4 glass-effect border border-white/10 text-gray-400 hover:text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 hover:bg-gray-50 text-base sm:text-lg bg-gray-800/50"
            >
              詳しく相談する
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
