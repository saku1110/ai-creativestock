import React, { useState } from 'react';
import { X, Crown, Check, CreditCard, Shield, Zap } from 'lucide-react';
import { auth } from '../lib/supabase';
import { stripeService, subscriptionPlans } from '../lib/stripe';
import { User } from '@supabase/supabase-js';

interface DirectPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: (user: User) => void;
}

const DirectPurchaseModal: React.FC<DirectPurchaseModalProps> = ({
  isOpen,
  onClose,
  onPurchaseSuccess
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<'standard' | 'pro' | 'business' | 'enterprise'>('pro');
  const [isLoading, setIsLoading] = useState(false);

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

  const handlePurchase = async () => {
    setIsLoading(true);
    
    try {
      // 開発環境では仮のユーザーIDを使用
      const userId = import.meta.env.DEV ? 'dev_user_id' : 'actual_user_id';
      
      // Stripe決済フローを開始
      const result = await stripeService.subscribeToPlan(
        selectedPlan,
        billingCycle,
        userId
      );

      if (!result.success) {
        alert(result.error || '決済処理に失敗しました。');
        return;
      }

      // 成功時は自動的にStripeのチェックアウトページにリダイレクトされる
    } catch (error) {
      console.error('Purchase error:', error);
      alert('決済処理でエラーが発生しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = subscriptionPlans.find(p => p.id === selectedPlan);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl border border-white/20 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">今すぐ利用する</h2>
              <p className="text-gray-400">即日フル機能をご利用いただけます</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 border cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? 'border-green-500/50 shadow-lg shadow-green-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedPlan(plan.id as 'standard' | 'pro' | 'business' | 'enterprise')}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    最も人気
                  </div>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                {billingCycle === 'yearly' ? (
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatPrice(plan.yearlyPrice / 12)}
                      <span className="text-sm font-normal text-gray-400">/月</span>
                    </div>
                    <div className="text-sm text-green-400">
                      {getYearlyDiscount(plan.monthlyPrice, plan.yearlyPrice)}
                    </div>
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-white">
                    {formatPrice(plan.monthlyPrice)}
                    <span className="text-sm font-normal text-gray-400">/月</span>
                  </div>
                )}
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-center">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedPlan === plan.id
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-600'
                }`} />
              </div>
            </div>
          ))}
        </div>

        {/* 選択したプランの詳細表示 */}
        {selectedPlanData && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-6">
            <h4 className="text-lg font-bold text-white mb-2">選択中のプラン</h4>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-white font-medium">{selectedPlanData.name}プラン</div>
                <div className="text-gray-400 text-sm">
                  月{selectedPlanData.monthlyDownloads}本ダウンロード
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">
                  {formatPrice(billingCycle === 'yearly' ? selectedPlanData.yearlyPrice / 12 : selectedPlanData.monthlyPrice)}
                  <span className="text-sm font-normal text-gray-400">
                    {billingCycle === 'yearly' ? '/月' : '/月'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="text-sm text-green-400">
                    年額: {formatPrice(selectedPlanData.yearlyPrice)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 安全性の説明 */}
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <h4 className="text-blue-400 font-bold">安全な決済</h4>
          </div>
          <p className="text-gray-300 text-sm">
            決済はStripeの安全なシステムを使用し、クレジットカード情報は暗号化されて保護されます。
          </p>
        </div>

        {/* 購入ボタン */}
        <button
          onClick={handlePurchase}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '決済ページに移動中...' : '今すぐ購入'}
        </button>
      </div>
    </div>
  );
};

export default DirectPurchaseModal;
