import React, { useState } from 'react';
import { Check } from 'lucide-react';

interface TestPricingProps {
  onDashboardNavigate: () => void;
  onPurchaseRequest?: () => void;
  onContactRequest?: () => void;
}

const TestPricing: React.FC<TestPricingProps> = ({ onDashboardNavigate, onPurchaseRequest, onContactRequest }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
  {
    id: 'standard',
    name: 'スタンダード',
    monthlyPrice: 14800,
    yearlyPrice: 9800 * 12,
      downloads: 15,
      features: [
        '月15本ダウンロード',
        '月10本動画リクエスト',
        '1080p解像度対応',
        '9:16縦型フォーマット',
        'メールサポート',
        '商用利用可能'
      ],
      popular: false
    },
    {
      id: 'pro',
      name: 'プロ',
      monthlyPrice: 29800,
      yearlyPrice: 19800 * 12,
      downloads: 30,
      features: [
        '月30本ダウンロード',
        '月20本動画リクエスト',
        '1080p解像度対応',
        '9:16縦型フォーマット',
        '優先サポート',
        '新作動画早期アクセス',
        '商用利用可能'
      ],
      popular: true
    },
    {
      id: 'business',
      name: 'ビジネス',
      monthlyPrice: 49800,
      yearlyPrice: 29800 * 12,
      downloads: 50,
      features: [
        '月50本ダウンロード',
        '無制限動画リクエスト',
        '1080p解像度対応',
        '動画リクエスト優先対応',
        '9:16縦型フォーマット',
        '優先サポート',
        '新作動画早期アクセス',
        '商用利用可能'
      ],
      popular: false
    },
    {
      id: 'enterprise',
      name: 'エンタープライズ',
      monthlyPrice: null,
      yearlyPrice: null,
      downloads: null,
      features: [
        '完全オーダーメイド制作',
        '希望業種に特化した動画制作',
        '個別納品対応',
        'カスタムフォーマット対応',
        '24時間専用サポート',
        '無制限動画リクエスト',
        '商用利用可能'
      ],
      popular: false,
      isCustom: true
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getYearlyDiscount = (monthlyPrice: number, yearlyPrice: number) => {
    const discount = Math.round((1 - (yearlyPrice / 12) / monthlyPrice) * 100);
    return `${discount}%お得`;
  };

  return (
    <section className="py-20 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              シンプルな料金プラン
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            あなたのニーズに合わせた最適なプランをお選びください
          </p>

          {/* 請求サイクル切り替え */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gray-800 rounded-xl p-1 border border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  月額プラン
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                    billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>年額プラン</span>
                    <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">
                      最大40%お得
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 料金カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? 'border-blue-500/50 shadow-2xl shadow-blue-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* 人気バッジ */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                    最も人気
                  </div>
                </div>
              )}

              {/* プラン名 */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">{plan.name}</h3>

                {plan.isCustom ? (
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      ASK
                    </div>
                    <div className="text-lg text-gray-400">
                      お問い合わせください
                    </div>
                  </div>
                ) : billingCycle === 'yearly' ? (
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      {formatPrice(plan.yearlyPrice! / 12)}
                      <span className="text-lg font-normal text-gray-400">/月</span>
                    </div>
                    <div className="text-lg text-gray-400 line-through">
                      {formatPrice(plan.monthlyPrice!)}/月
                    </div>
                    <div className="text-sm text-green-400 font-medium">
                      年額払いで{getYearlyDiscount(plan.monthlyPrice!, plan.yearlyPrice!)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      {formatPrice(plan.monthlyPrice!)}
                      <span className="text-lg font-normal text-gray-400">/月</span>
                    </div>
                  </div>
                )}

                {plan.downloads && (
                  <p className="text-gray-400 mt-4">
                    月間{plan.downloads}本ダウンロード可能
                  </p>
                )}
              </div>

              {/* 機能リスト */}
              <div className="mb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTAボタン */}
              <div>
                <button
                  onClick={plan.isCustom ? onContactRequest : (billingCycle === 'yearly' ? onPurchaseRequest : onDashboardNavigate)}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                    plan.isCustom
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-105 shadow-lg hover:shadow-orange-500/25'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 shadow-lg hover:shadow-blue-500/25'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg hover:shadow-green-500/25'
                  }`}
                >
                  {plan.isCustom ? 'お問い合わせ' : '今すぐ始める'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 追加情報 */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20">
            <h3 className="text-lg font-semibold text-white mb-3">
              {billingCycle === 'yearly' ? '💰 年額プランのメリット' : '🎬 AI動画一覧をご覧ください'}
            </h3>
            <p className="text-gray-400">
              {billingCycle === 'yearly'
                ? '年額プランなら最大40%お得。即座にフル機能をご利用いただけます。'
                : '豊富なAI動画素材ライブラリをご覧いただけます。気に入った素材があれば各プランでダウンロード可能です。'
              }
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestPricing;
