import React, { useState } from 'react';
import { X, AlertTriangle, Zap, TrendingUp, Clock, Check } from 'lucide-react';
import { stripeService } from '../lib/stripe';

interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  trialDaysRemaining?: number;
  downloadsRemaining?: number;
  reason: 'limit_reached' | 'trial_ending' | 'usage_warning';
}

const UpgradePromptModal: React.FC<UpgradePromptModalProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess,
  trialDaysRemaining = 0,
  downloadsRemaining = 0,
  reason
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'pro' | 'business' | 'enterprise'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const plans = [
    {
      id: 'standard',
      name: 'スタンダード',
      monthlyPrice: 14800,
      yearlyPrice: 9800 * 12,
      downloads: 20,
      features: ['月20本ダウンロード', '9:16縦型フォーマット', 'メールサポート']
    },
    {
      id: 'pro',
      name: 'プロ',
      monthlyPrice: 29800,
      yearlyPrice: 19800 * 12,
      downloads: 40,
      features: ['月40本ダウンロード', '9:16縦型フォーマット', '優先サポート'],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'ビジネス',
      monthlyPrice: 49800,
      yearlyPrice: 29800 * 12,
      downloads: 70,
      features: ['月70本ダウンロード', '9:16縦型フォーマット', '24時間サポート']
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getModalContent = () => {
    switch (reason) {
      case 'limit_reached':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-orange-400" />,
          iconBg: 'from-orange-500 to-red-600',
          title: 'ダウンロード制限に達しました',
          subtitle: '現在のプランのダウンロード上限に到達しました',
          urgency: 'high',
          ctaText: 'すぐにアップグレードして続行'
        };
      case 'trial_ending':
        return {
          icon: <Clock className="w-8 h-8 text-yellow-400" />,
          iconBg: 'from-yellow-500 to-orange-600',
          title: `ご利用期限まであと${trialDaysRemaining}日`,
          subtitle: '期間後も継続利用するにはプランの更新が必要です',
          urgency: 'medium',
          ctaText: 'アップグレードして継続利用'
        };
      case 'usage_warning':
        return {
          icon: <TrendingUp className="w-8 h-8 text-blue-400" />,
          iconBg: 'from-blue-500 to-purple-600',
          title: `残り${downloadsRemaining}本の動画をダウンロード可能`,
          subtitle: 'より多くの動画をダウンロードしてマーケティングを加速しませんか？',
          urgency: 'low',
          ctaText: 'フル機能を利用開始'
        };
      default:
        return {
          icon: <Zap className="w-8 h-8 text-cyan-400" />,
          iconBg: 'from-cyan-500 to-blue-600',
          title: 'プレミアム機能をアンロック',
          subtitle: 'より多くの動画でマーケティングを成功に導きましょう',
          urgency: 'medium',
          ctaText: 'アップグレード'
        };
    }
  };

  const handleUpgrade = async () => {
    setIsLoading(true);
    
    try {
      // 直接Stripeリンクに飛ばす（実際のStripeリンクURLに置き換える）
      const stripeLinks = {
        standard: {
          monthly: 'https://buy.stripe.com/standard-monthly',
          yearly: 'https://buy.stripe.com/standard-yearly'
        },
        pro: {
          monthly: 'https://buy.stripe.com/pro-monthly',
          yearly: 'https://buy.stripe.com/pro-yearly'
        },
        enterprise: {
          monthly: 'https://buy.stripe.com/enterprise-monthly',
          yearly: 'https://buy.stripe.com/enterprise-yearly'
        }
      };

      const stripeUrl = stripeLinks[selectedPlan][billingCycle];
      window.location.href = stripeUrl;
    } catch (error) {
      console.error('Stripe redirect error:', error);
      alert('決済ページへの移動に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = getModalContent();
  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${modalContent.iconBg} rounded-2xl flex items-center justify-center`}>
              {modalContent.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{modalContent.title}</h2>
              <p className="text-gray-400">{modalContent.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* アップグレードのメリット */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-2xl p-4 border border-green-500/20 mb-6">
          <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            アップグレードで得られるメリット
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">制限解除</div>
              <div className="text-sm text-gray-400">月20本〜70本利用可能</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">優先</div>
              <div className="text-sm text-gray-400">サポート対応</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">高品質</div>
              <div className="text-sm text-gray-400">AI生成動画</div>
            </div>
          </div>
        </div>

        {/* 請求サイクル選択 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-4">請求サイクル</h3>
          <div className="flex bg-gray-800 rounded-xl p-1 border border-gray-700">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              月額プラン
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              年額プラン（最大40%お得）
            </button>
          </div>
        </div>

        {/* プラン選択 */}
        <div className="space-y-3 mb-6">
          <h3 className="text-lg font-bold text-white">プランを選択</h3>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gray-800/50 rounded-xl p-4 border cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'border-green-500/50 shadow-lg shadow-green-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedPlan(plan.id as 'standard' | 'pro' | 'business' | 'enterprise')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedPlan === plan.id
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-600'
                  }`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white font-bold">{plan.name}</h4>
                      {plan.popular && (
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                          人気
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      月{plan.downloads}本ダウンロード
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {formatPrice(billingCycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice)}
                    <span className="text-sm font-normal text-gray-400">/月</span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="text-sm text-green-400">
                      年額: {formatPrice(plan.yearlyPrice)}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedPlan === plan.id && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Check className="w-3 h-3 text-green-400" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-gray-300 py-3 px-6 rounded-xl font-bold hover:bg-gray-600 transition-colors"
          >
            後で
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className={`flex-2 bg-gradient-to-r ${modalContent.iconBg} text-white py-3 px-6 rounded-xl font-bold hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? 'Stripeページに移動中...' : 'Stripeで' + modalContent.ctaText}
          </button>
        </div>

        {/* 緊急度に応じた追加メッセージ */}
        {reason === 'limit_reached' && (
          <div className="mt-4 text-center">
            <p className="text-orange-400 text-sm font-medium">
              ⚠️ ダウンロード制限に達しているため、アップグレードするまで新しい動画をダウンロードできません
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradePromptModal;
