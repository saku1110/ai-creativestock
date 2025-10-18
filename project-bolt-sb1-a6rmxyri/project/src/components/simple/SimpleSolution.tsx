import React from 'react';

const SimpleSolution: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'プランを選択',
      description: 'ニーズに合わせた3つのプランから選択。AI動画素材一覧を見るから導入検討が始まります。',
      image: '🎯'
    },
    {
      number: '02',
      title: '素材を選んで編集',
      description: '1000+の高品質AI動画から選び放題。簡単な編集ツールでカスタマイズ。',
      image: '🎬'
    },
    {
      number: '03',
      title: '即座に配信開始',
      description: 'ダウンロードして即座に広告配信。A/Bテストも簡単に実施可能。',
      image: '🚀'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            たった3ステップで動画マーケティングを革新
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            複雑な制作プロセスは不要。誰でも簡単に始められます
          </p>
        </div>

        <div className="space-y-12">
          {steps.map((step, index) => (
            <div key={index} className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              {/* テキストコンテンツ */}
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <span className="text-5xl font-bold text-gray-200 mr-4">
                    {step.number}
                  </span>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {step.title}
                  </h3>
                </div>
                <p className="text-lg text-gray-600">
                  {step.description}
                </p>
              </div>

              {/* ビジュアル */}
              <div className="flex-1 flex justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center">
                  <span className="text-8xl">{step.image}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 結果の強調 */}
        <div className="mt-16 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              結果：制作時間を90%削減、コストを80%カット
            </h3>
            <div className="flex justify-center gap-8 flex-wrap">
              <div>
                <p className="text-3xl font-bold text-indigo-600">72時間→2時間</p>
                <p className="text-gray-600">制作時間</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">10万円→2.98万円</p>
                <p className="text-gray-600">月額コスト</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-indigo-600">CVR 3倍</p>
                <p className="text-gray-600">成果向上</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleSolution;
