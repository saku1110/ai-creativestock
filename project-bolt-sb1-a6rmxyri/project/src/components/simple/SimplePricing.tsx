import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

interface SimplePricingProps {
  onSelectPlan: (plan: string) => void;
}

const SimplePricing: React.FC<SimplePricingProps> = ({ onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      id: 'standard',
      name: 'スタンダード',
      monthlyPrice: 14800,
      yearlyPrice: 9800,
      downloads: 20,
      features: [
        '月間20本ダウンロード',
        '4K解像度対応',
        '基本ライセンス',
        'メールサポート',
        '基本カテゴリアクセス'
      ],
      notIncluded: [
        '優先サポート',
        '新作早期アクセス',
        'カスタムリクエスト'
      ]
    },
    {
      id: 'pro',
      name: 'プロ',
      monthlyPrice: 29800,
      yearlyPrice: 19800,
      downloads: 40,
      recommended: true,
      features: [
        '月間40本ダウンロード',
        '4K解像度対応',
        '拡張ライセンス',
        '優先サポート',
        '新作動画早期アクセス',
        '全カテゴリアクセス'
      ],
      notIncluded: [
        'カスタムリクエスト',
        'API利用'
      ]
    },
    {
      id: 'business',
      name: 'ビジネス',
      monthlyPrice: 49800,
      yearlyPrice: 29800,
      downloads: 70,
      features: [
        '月間70本ダウンロード',
        '4K解像度対応',
        '商用ライセンス',
        '24時間サポート',
        '新作動画早期アクセス',
        'カスタムリクエスト',
        'API利用可能',
        '専属アカウントマネージャー'
      ],
      notIncluded: []
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP').format(price);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            シンプルで透明な料金プラン
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            追加料金なし。いつでも解約可能。AI動画素材一覧を見るから詳細を確認できます
          </p>

          {/* 料金切り替え */}
          <div className="inline-flex items-center bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600'
              }`}
            >
              月額
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600'
              }`}
            >
              年額
              <span className="ml-1 text-green-600 text-sm">最大40%OFF</span>
            </button>
          </div>
        </div>

        {/* プランカード */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border-2 ${
                plan.recommended
                  ? 'border-indigo-600 relative'
                  : 'border-gray-200'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    人気No.1
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      ¥{formatPrice(
                        billingCycle === 'monthly'
                          ? plan.monthlyPrice
                          : plan.yearlyPrice
                      )}
                    </span>
                    <span className="text-gray-600 ml-2">/月</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      年額 ¥{formatPrice(plan.yearlyPrice * 12)}
                    </p>
                  )}
                </div>

                <p className="text-gray-600 mb-6">
                  月間{plan.downloads}本まで
                </p>

                <button
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.recommended
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  このプランを選択
                </button>

                <div className="mt-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <X className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-400">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 返金保証 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center bg-green-50 px-6 py-3 rounded-lg">
            <Check className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">
              30日間返金保証・いつでも解約可能・追加料金なし
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimplePricing;
