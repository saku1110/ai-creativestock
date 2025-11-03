import React, { useState } from 'react';
import { Check, Star, Zap, Crown, Cpu, Database, Shield, Palette, User, Settings, Award } from 'lucide-react';

interface PricingSectionProps {
  onAuthRequest: () => void;
  onContactRequest: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ onAuthRequest, onContactRequest }) => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: 'standard',
      name: 'スタンダード',
      monthlyPrice: 14800,
      annualPrice: 9800,
      period: 'month',
      description: '個人クリエイター向け',
      features: [
        '月20本の実写級動画広告ダウンロード',
        '9:16縦型フォーマット',
        '標準ライセンス',
        '4K解像度対応',
        'メールサポート',
        '基本的な検索機能',
        'プレビュー機能'
      ],
      downloads: 20,
      icon: Star,
      color: 'gray'
    },
    {
      id: 'pro',
      name: 'プロ',
      monthlyPrice: 29800,
      annualPrice: 19800,
      period: 'month',
      description: 'プロフェッショナル向け',
      features: [
        '月40本の実写級動画広告ダウンロード',
        '全プラットフォーム対応',
        '拡張ライセンス',
        '4K解像度対応',
        '優先サポート',
        'AI検索・フィルター',
        'プレビュー機能',
        'お気に入り機能',
        'チーム共有機能',
        '新作動画早期アクセス'
      ],
      downloads: 40,
      icon: Zap,
      color: 'blue',
      isPopular: true
    },
    {
      id: 'business',
      name: 'ビジネス',
      monthlyPrice: 49800,
      annualPrice: 29800,
      period: 'month',
      description: '企業・チーム向け',
      features: [
        '月70本の実写級動画広告ダウンロード',
        '全プラットフォーム対応',
        '商用ライセンス',
        '4K解像度対応',
        '24時間サポート',
        'カスタムAI検索',
        'チーム管理機能',
        'API アクセス',
        '専用アカウントマネージャー',
        '新作動画早期アクセス',
        '優先新作アクセス'
      ],
      downloads: 70,
      icon: Crown,
      color: 'purple'
    }
  ];

  const formatPrice = (price: number | null, period: 'monthly' | 'annual' = 'monthly') => {
    if (price === null) return 'お問い合わせ';
    const formattedPrice = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
    
    // 年間プランでも/月を表示しない
    return formattedPrice;
  };

  const getCurrentPrice = (plan: any) => {
    return billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
  };

  const getSavingsPercentage = (plan: any) => {
    const monthlyCost = plan.monthlyPrice * 12;
    const annualCost = plan.annualPrice * 12;
    return Math.round(((monthlyCost - annualCost) / monthlyCost) * 100);
  };

  const getColorClasses = (color: string, isPopular?: boolean) => {
    const colors = {
      gray: {
        bg: 'from-gray-800 to-gray-900',
        border: 'border-gray-600',
        icon: 'text-gray-400',
        button: 'bg-gray-600 hover:bg-gray-700',
        accent: 'text-gray-400'
      },
      blue: {
        bg: 'from-cyan-500 to-blue-600',
        border: 'border-cyan-400',
        icon: 'text-cyan-400',
        button: 'cyber-button',
        accent: 'text-cyan-400'
      },
      purple: {
        bg: 'from-purple-500 to-pink-600',
        border: 'border-purple-400',
        icon: 'text-purple-400',
        button: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
        accent: 'text-purple-400'
      }
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6">
            <span className="gradient-text">動画広告素材</span>料金プラン
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto px-4">
            高品質動画広告素材のダウンロード数に合わせて選べるプラン。
            <br className="hidden sm:block" />
            いつでもアップグレード・ダウングレード可能です。
          </p>
          
          {/* 料金期間切り替え */}
          <div className="flex justify-center mt-8 sm:mt-12">
            <div className="glass-dark rounded-2xl p-2 border border-white/10 bg-gray-800/50">
              <div className="flex items-center">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 ${
                    billingPeriod === 'monthly'
                      ? 'cyber-button text-white shadow-2xl'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  月額プラン
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 relative ${
                    billingPeriod === 'annual'
                      ? 'cyber-button text-white shadow-2xl'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  年間プラン
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-black">
                    お得
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 通常の料金プラン */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-16 sm:mb-20">
          {plans.map((plan) => {
            const colors = getColorClasses(plan.color, plan.isPopular);
            const IconComponent = plan.icon;
            
            return (
              <div
                key={plan.id}
                className={`relative glass-dark rounded-2xl sm:rounded-3xl shadow-2xl border-2 transition-all duration-500 hover-lift bg-gray-800/50 ${
                  plan.isPopular 
                    ? 'border-cyan-400 ring-4 ring-cyan-400/20 shadow-cyan-500/25 lg:scale-105' 
                    : 'border-white/10 hover:border-gray-400'
                }`}
              >
                {/* 人気バッジ */}
                {plan.isPopular && (
                  <div className="absolute -top-4 sm:-top-6 left-1/2 transform -translate-x-1/2">
                    <div className="cyber-button text-white px-4 sm:px-6 lg:px-8 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-black shadow-2xl animate-pulse">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Cpu className="w-3 sm:w-4 h-3 sm:h-4" />
                        <span>最も人気</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8 lg:p-10">
                  {/* アイコンとプラン名 */}
                  <div className="text-center mb-8 sm:mb-10">
                    <div className={`inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${colors.bg} mb-4 sm:mb-6 shadow-2xl`}>
                      <IconComponent className={`w-8 sm:w-10 h-8 sm:h-10 text-white`} />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">{plan.name}</h3>
                    <p className="text-gray-400 font-medium text-sm sm:text-base">{plan.description}</p>
                  </div>

                  {/* 価格 */}
                  <div className="text-center mb-8 sm:mb-10">
                    {billingPeriod === 'annual' && (
                      <div className="mb-4">
                        <span className="glass-dark bg-green-500/10 border border-green-400/30 text-green-400 px-4 py-2 rounded-full text-sm font-bold">
                          年間{getSavingsPercentage(plan)}%お得
                        </span>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">
                        {formatPrice(getCurrentPrice(plan), billingPeriod)}
                        {billingPeriod === 'monthly' && (
                          <span className="text-gray-400 ml-2 sm:ml-3 text-base sm:text-lg">/月</span>
                        )}
                      </div>
                      {billingPeriod === 'annual' && (
                        <p className="text-gray-400 text-base sm:text-lg mt-2">(年間一括)</p>
                      )}
                    </div>
                    {billingPeriod === 'annual' && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-2">
                        年間{formatPrice(getCurrentPrice(plan) * 12)}一括払い
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-400 mt-2 sm:mt-3 font-medium">
                      月{plan.downloads}本の動画広告素材
                    </p>
                  </div>

                  {/* 機能リスト */}
                  <ul className="space-y-3 sm:space-y-4 lg:space-y-5 mb-8 sm:mb-10">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 mr-3 sm:mr-4 mt-0.5 sm:mt-1 flex-shrink-0">
                          <Check className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                        </div>
                        <span className="text-gray-400 font-medium text-sm sm:text-base">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA ボタン */}
                  <button 
                    onClick={onAuthRequest}
                    className={`w-full py-4 sm:py-5 px-6 sm:px-8 rounded-xl sm:rounded-2xl font-black transition-all duration-300 shadow-2xl transform hover:-translate-y-1 text-sm sm:text-base lg:text-lg ${
                    plan.isPopular 
                      ? 'cyber-button text-white hover:shadow-cyan-500/25' 
                      : `${colors.button} text-white`
                  }`}>
                    {`${plan.name}プラン（${billingPeriod === 'annual' ? '年間' : '月額'}）を始める`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* オーダーメイドプラン */}
        <div className="max-w-6xl mx-auto">
          <div className="glass-dark rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-orange-400 ring-4 ring-orange-400/20 shadow-orange-500/25 overflow-hidden">
            {/* カスタムバッジ */}
            <div className="text-center py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600">
              <div className="flex items-center justify-center space-x-2">
                <Palette className="w-5 h-5 text-white" />
                <span className="text-white font-black text-lg">完全カスタム制作</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* 左側：プラン情報 */}
                <div className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                      <Palette className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white mb-1">オーダーメイド</h3>
                      <p className="text-orange-400 font-bold">素材の人物やシーンをオーダーメイド</p>
                    </div>
                  </div>

                  <p className="text-gray-300 leading-relaxed mb-8 text-base sm:text-lg">
                    お客様のブランドやコンセプトに合わせて、完全オリジナルの動画素材を制作いたします。
                    人物の特徴、シーン設定、ブランドカラーなど、細部まで調整可能です。
                  </p>

                  <div className="text-center lg:text-left mb-8">
                    <div className="text-4xl font-black text-white mb-2">お問い合わせ</div>
                    <p className="text-gray-400">完全オーダーメイド動画広告制作</p>
                  </div>

                  <button 
                    onClick={onContactRequest}
                    className="w-full lg:w-auto bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:from-orange-600 hover:via-pink-600 hover:to-purple-700 text-white py-4 px-8 rounded-xl font-black transition-all duration-300 shadow-2xl hover:shadow-orange-500/25 text-lg"
                  >
                    お問い合わせ
                  </button>
                </div>

                {/* 右側：サービス特徴 */}
                <div className="space-y-6">
                  <h4 className="text-xl font-bold text-white mb-6 text-center lg:text-left">サービス特徴</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="glass-dark rounded-xl p-4 border border-orange-400/30 hover:bg-orange-400/5 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Settings className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white">完全カスタム</h5>
                          <p className="text-gray-400 text-sm">人物・シーン・設定</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-dark rounded-xl p-4 border border-purple-400/30 hover:bg-purple-400/5 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white">専属チーム</h5>
                          <p className="text-gray-400 text-sm">専門スタッフが対応</p>
                        </div>
                      </div>
                    </div>

                    <div className="glass-dark rounded-xl p-4 border border-cyan-400/30 hover:bg-cyan-400/5 transition-all">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white">高品質保証</h5>
                          <p className="text-gray-400 text-sm">高品質実写級AI動画</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 追加情報 */}
        <div className="text-center mt-16 sm:mt-20">
          <div className="glass-dark rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto border border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-3 mb-4 sm:mb-6">
              <Shield className="w-6 sm:w-8 h-6 sm:h-8 text-green-400 flex-shrink-0" />
              <p className="text-lg sm:text-xl text-white font-bold text-center sm:text-left">
                すべてのプランに30日間の返金保証が付いています
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <button className="text-cyan-400 hover:text-white font-bold transition-colors text-base sm:text-lg">
                プラン比較表を見る
              </button>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <button className="text-cyan-400 hover:text-white font-bold transition-colors text-base sm:text-lg">
                よくある質問
              </button>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <button
                onClick={onContactRequest}
                className="text-orange-400 hover:text-white font-bold transition-colors text-base sm:text-lg"
              >
                オーダーメイドについて
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
