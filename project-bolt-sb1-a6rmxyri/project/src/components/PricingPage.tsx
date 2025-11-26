import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { stripeService } from '../lib/stripe';
import { useUser } from '../hooks/useUser';

interface PricingPageProps {
  onPageChange?: (page: string) => void;
  isNewUser?: boolean;
}

// プランレベル定義（アップグレード/ダウングレード判定用）
const PLAN_LEVELS: Record<string, number> = {
  standard: 1,
  pro: 2,
  business: 3,
  enterprise: 4
};

const PricingPage: React.FC<PricingPageProps> = ({ onPageChange, isNewUser = false }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [showSkipButton, setShowSkipButton] = useState(false);
  const { user, subscription, hasActiveSubscription } = useUser();

  // LPと同じプラン定義
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

  const formatPriceYen = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getYearlyDiscountPercent = (monthlyPrice: number, yearlyPrice: number) => {
    const discount = Math.round((1 - (yearlyPrice / 12) / monthlyPrice) * 100);
    return `${discount}%お得`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollToPricing = () => {
      const target = document.getElementById('pricing-plans');
      if (target) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };
    requestAnimationFrame(scrollToPricing);
  }, []);

  // 新規ユーザーの場合、一定時間後にスキップボタンを表示
  useEffect(() => {
    if (isNewUser) {
      const timer = setTimeout(() => {
        setShowSkipButton(true);
      }, 5000); // 5秒後に表示

      return () => clearTimeout(timer);
    }
  }, [isNewUser]);

  // ボタン表示ロジック
  const getButtonState = (planId: string, isCustom?: boolean) => {
    // エンタープライズは常にお問い合わせ
    if (isCustom) {
      return { text: 'お問い合わせ', disabled: false, variant: 'contact' as const };
    }

    // 未ログインまたはサブスク未加入
    if (!hasActiveSubscription || !subscription?.plan) {
      return { text: '今すぐ始める', disabled: false, variant: 'subscribe' as const };
    }

    const currentPlan = subscription.plan;

    // 現在のプラン
    if (currentPlan === planId) {
      return { text: '現在のプラン', disabled: true, variant: 'current' as const };
    }

    // アップグレード/ダウングレード判定
    const currentLevel = PLAN_LEVELS[currentPlan] || 0;
    const targetLevel = PLAN_LEVELS[planId] || 0;

    if (targetLevel > currentLevel) {
      return { text: 'アップグレード', disabled: false, variant: 'upgrade' as const };
    } else {
      return { text: 'ダウングレード', disabled: false, variant: 'downgrade' as const };
    }
  };

  const handleSubscribe = async (planId: string, isCustom?: boolean) => {
    // エンタープライズプランの場合はお問い合わせページへ遷移
    if (isCustom) {
      onPageChange?.('contact');
      return;
    }

    setLoading(planId);

    try {
      // 既存会員の場合はCustomer Portalにリダイレクト（userがnullでもsubscriptionがあればOK）
      if (hasActiveSubscription && subscription?.stripe_customer_id) {
        const { url, error } = await stripeService.createCustomerPortalSession(
          subscription.stripe_customer_id,
          `${window.location.origin}/pricing`
        );

        if (error) {
          alert(error);
          return;
        }

        if (url) {
          window.location.href = url;
          return;
        }
      }

      // 新規会員は通常のチェックアウト（ここでuserが必要）
      if (!user) {
        alert('ログインが必要です');
        return;
      }

      const result = await stripeService.subscribeToPlan(
        planId,
        billingPeriod === 'yearly' ? 'yearly' : 'monthly',
        user.id
      );

      if (!result.success) {
        alert(result.error || '購入処理に失敗しました');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('購入処理中にエラーが発生しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div id="pricing-plans" className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6">
            <span className="gradient-text">料金プラン</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            {isNewUser ? (
              <>
                ようこそ！AI Creative Stockへ。<br />
                まずは最適なプランをお選びください。
              </>
            ) : (
              <>
                あなたのニーズに合わせた最適なプランをお選びください。<br />
                高品質なAI動画素材で、マーケティングを次のレベルへ。
              </>
            )}
          </p>
          
          {/* 新規ユーザー向けのスキップボタン */}
          {isNewUser && showSkipButton && (
            <div className="mb-8">
              <button
                onClick={() => onPageChange && onPageChange('dashboard')}
                className="text-gray-400 hover:text-white underline text-sm transition-colors"
              >
                今はスキップして後で選ぶ →
              </button>
            </div>
          )}

          {/* 料金期間切り替え */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gray-800 rounded-xl p-1 border border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    billingPeriod === 'monthly'
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  月額プラン
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                    billingPeriod === 'yearly'
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
                ) : billingPeriod === 'yearly' ? (
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      {formatPriceYen(plan.yearlyPrice! / 12)}
                      <span className="text-lg font-normal text-gray-400">/月</span>
                    </div>
                    <div className="text-lg text-gray-400 line-through">
                      {formatPriceYen(plan.monthlyPrice!)}/月
                    </div>
                    <div className="text-sm text-green-400 font-medium">
                      年額払いで{getYearlyDiscountPercent(plan.monthlyPrice!, plan.yearlyPrice!)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl font-black text-white mb-2">
                      {formatPriceYen(plan.monthlyPrice!)}
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
                {(() => {
                  const buttonState = getButtonState(plan.id, plan.isCustom);
                  return (
                    <button
                      onClick={() => handleSubscribe(plan.id, plan.isCustom)}
                      disabled={loading === plan.id || buttonState.disabled}
                      className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                        buttonState.disabled
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : buttonState.variant === 'contact'
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:scale-105 shadow-lg hover:shadow-orange-500/25'
                          : buttonState.variant === 'upgrade'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 shadow-lg hover:shadow-blue-500/25'
                          : buttonState.variant === 'downgrade'
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-white hover:scale-105 shadow-lg hover:shadow-gray-500/25'
                          : plan.popular
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:scale-105 shadow-lg hover:shadow-blue-500/25'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:scale-105 shadow-lg hover:shadow-green-500/25'
                      } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {loading === plan.id ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>処理中...</span>
                        </div>
                      ) : (
                        buttonState.text
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            よくある質問
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                月間ダウンロード数を超えた場合はどうなりますか？
              </h3>
              <p className="text-gray-400">
                月間制限に達した場合、翌月まで新たなダウンロードはできません。より多くのダウンロードが必要な場合は、上位プランへのアップグレードをご検討ください。
              </p>
            </div>

            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                プランの変更はいつでも可能ですか？
              </h3>
              <p className="text-gray-400">
                はい、いつでもプランの変更が可能です。アップグレードは即座に反映され、ダウングレードは次回請求サイクルから適用されます。
              </p>
            </div>

            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                年額プランの支払いタイミングは？
              </h3>
              <p className="text-gray-400">
                年額プランは1年分を一括でお支払いいただきます。月額プランと比較して最大40%お得になり、毎月の請求の手間もありません。
              </p>
            </div>

            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                キャンセルはいつでもできますか？
              </h3>
              <p className="text-gray-400">
                はい、いつでもキャンセル可能です。キャンセル後も現在の請求期間終了まではサービスをご利用いただけます。
              </p>
            </div>

            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">
                商用利用は可能ですか？
              </h3>
              <p className="text-gray-400">
                プロプラン以上で商用利用が可能です。ビジネスプランでは拡張商用ライセンスが含まれ、より幅広い用途でご利用いただけます。
              </p>
            </div>
          </div>
        </div>

        {/* お問い合わせ */}
        <div className="mt-20 text-center">
          <div className="glass-effect rounded-3xl p-12 border border-white/10 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">
              その他のご質問がありますか？
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              お気軽にお問い合わせください。専門スタッフが丁寧にサポートいたします。
            </p>
            <button className="cyber-button text-white py-4 px-8 text-lg font-bold hover:scale-105 transition-transform">
              お問い合わせ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
