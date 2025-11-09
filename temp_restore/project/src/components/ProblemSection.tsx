import React from 'react';
import { AlertTriangle, DollarSign, Clock, Users, TrendingDown, Camera, CreditCard } from 'lucide-react';

const ProblemSection: React.FC = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: '素材不足',
      description: '毎日投稿する広告素材が足りない',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: DollarSign,
      title: '高い制作コスト',
      description: '撮影に時間とお金がかかりすぎる',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Camera,
      title: '実写の制約',
      description: '撮影環境や天候、人物の演技力に左右される',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: CreditCard,
      title: '外注費の負担',
      description: '1本1万円～の制作費が継続的に発生',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Users,
      title: '競合との差別化',
      description: 'フリー素材では他社と被ってしまう',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: TrendingDown,
      title: '成約率の低迷',
      description: 'ABテストが進まず広告効果が上がらない',
      color: 'from-pink-500 to-pink-600'
    }
  ];

  const stats = [
    {
      percentage: '78%',
      description: '企業の78%がSNS広告素材制作に課題を感じている'
    },
    {
      percentage: '30万円',
      description: '平均制作コスト: 月間30万円（月30本制作の場合）'
    },
    {
      percentage: '1.2%',
      description: '成約率: 平均1.2%（業界平均）'
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            SNS広告の<span className="gradient-text">成約率向上</span>、<br className="sm:hidden" />できていますか？
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            多くの企業がSNS広告素材制作で抱える課題をご存知ですか？
          </p>
        </div>

        {/* 課題一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <div key={index} className="glass-dark rounded-2xl p-6 sm:p-8 border border-red-400/20 hover-lift">
                <div className={`w-16 h-16 bg-gradient-to-br ${problem.color} rounded-2xl flex items-center justify-center mb-6 shadow-2xl`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  🔥 {problem.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{problem.description}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ProblemSection;