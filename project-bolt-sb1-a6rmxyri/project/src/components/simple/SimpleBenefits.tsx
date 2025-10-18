import React from 'react';
import { Check } from 'lucide-react';

const SimpleBenefits: React.FC = () => {
  const benefits = [
    {
      category: '時間削減',
      items: [
        '制作時間を90%短縮',
        '即座にダウンロード可能',
        'テンプレート不要の完成品'
      ]
    },
    {
      category: 'コスト削減',
      items: [
        '外注費を80%カット',
        '追加料金なしで使い放題',
        '複数案の同時テスト可能'
      ]
    },
    {
      category: '品質向上',
      items: [
        'プロ品質のAI動画',
        '4K解像度対応',
        'ブランドイメージ向上'
      ]
    },
    {
      category: '成果改善',
      items: [
        'CVR平均3倍向上',
        'エンゲージメント率2倍',
        'ROI 150%改善'
      ]
    },
    {
      category: '使いやすさ',
      items: [
        '専門知識不要',
        '日本語完全対応',
        '24時間サポート'
      ]
    },
    {
      category: '柔軟性',
      items: [
        'いつでも解約可能',
        'プラン変更自由',
        '商用利用OK'
      ]
    }
  ];

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI Creative Stockを選ぶ6つの理由
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            10,000社以上が選んだ理由がここにあります
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                {benefit.category}
              </h3>
              <ul className="space-y-3">
                {benefit.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 統計データ */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-4xl font-bold text-indigo-600">10,000+</p>
            <p className="text-gray-600 mt-2">導入企業数</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-indigo-600">1,000+</p>
            <p className="text-gray-600 mt-2">動画素材数</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-indigo-600">98%</p>
            <p className="text-gray-600 mt-2">顧客満足度</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-indigo-600">24/7</p>
            <p className="text-gray-600 mt-2">サポート体制</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleBenefits;