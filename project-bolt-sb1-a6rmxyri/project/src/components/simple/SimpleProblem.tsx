import React from 'react';
import { Clock, DollarSign, AlertCircle } from 'lucide-react';

const SimpleProblem: React.FC = () => {
  const problems = [
    {
      icon: Clock,
      title: '制作時間が長すぎる',
      description: '従来の動画制作では1本あたり2-3日かかり、スピード感のあるマーケティングができない',
      stat: '平均72時間'
    },
    {
      icon: DollarSign,
      title: 'コストが高すぎる',
      description: 'プロのクリエイターに依頼すると1本10万円以上。複数パターンのテストは現実的でない',
      stat: '1本10万円〜'
    },
    {
      icon: AlertCircle,
      title: '品質が不安定',
      description: 'フリー素材は品質が低く、ブランドイメージを損なうリスクがある',
      stat: 'CVR-40%'
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            動画マーケティングの3つの壁
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            多くの企業が直面している課題を、私たちが解決します
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <div key={index} className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <problem.icon className="w-6 h-6 text-red-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {problem.title}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {problem.description}
              </p>
              
              <div className="pt-4 border-t border-gray-100">
                <span className="text-2xl font-bold text-red-600">
                  {problem.stat}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 問題の結果 */}
        <div className="mt-12 bg-red-50 rounded-xl p-8 border border-red-200">
          <div className="text-center">
            <p className="text-xl font-semibold text-red-900 mb-2">
              結果：競合に遅れを取り、機会損失が拡大
            </p>
            <p className="text-gray-700">
              動画マーケティングを諦めるか、莫大な投資をするか...そんな二択に悩んでいませんか？
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleProblem;