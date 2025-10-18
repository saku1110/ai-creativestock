import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe公開可能キー
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// 開発環境ではStripeキーが無くても動作するようにする
if (!stripePublishableKey && import.meta.env.PROD) {
  throw new Error('Stripe公開可能キーが設定されていません。.envファイルを確認してください。');
}

// Stripeインスタンス
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// サブスクリプションプランの定義
export interface SubscriptionPlan {
  id: 'standard' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number; // 月額料金（円）
  yearlyPrice: number; // 年額料金（円）
  monthlyDownloads: number;
  features: string[];
  monthlyStripePriceId: string; // 月額Stripe価格ID
  yearlyStripePriceId: string; // 年額Stripe価格ID
  popular?: boolean;
  yearlyDiscount?: number; // 年額割引率（%）
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'スタンダード',
    monthlyPrice: 14800,
    yearlyPrice: 9800 * 12, // 月額14,800 / 年額9,800（年払い時、1か月あたり）
    monthlyDownloads: 20,
    features: [
      '月間20本ダウンロード',
      '4K解像度対応',
      '基本ライセンス',
      'メールサポート'
    ],
    monthlyStripePriceId: 
      import.meta.env.VITE_PRICE_STANDARD_MONTHLY || 'price_1QZyaQKpWTNKTKELRgQTOJKD',
    yearlyStripePriceId: 
      import.meta.env.VITE_PRICE_STANDARD_YEARLY || 'price_1QZyeRKpWTNKTKELStandardYear',
    yearlyDiscount: 34 // 約34%オフ
  },
  {
    id: 'pro',
    name: 'プロ',
    monthlyPrice: 29800,
    yearlyPrice: 19800 * 12, // LPと同じ年額月額: ¥19,800
    monthlyDownloads: 40,
    features: [
      '月間40本ダウンロード',
      '4K解像度対応',
      '拡張ライセンス',
      '優先サポート',
      '新作動画早期アクセス'
    ],
    monthlyStripePriceId: 
      import.meta.env.VITE_PRICE_PRO_MONTHLY || 'price_1QZybDKpWTNKTKELQfQbRKMN',
    yearlyStripePriceId: 
      import.meta.env.VITE_PRICE_PRO_YEARLY || 'price_1QZyeRKpWTNKTKELProYear',
    popular: true,
    yearlyDiscount: 40 // 約40%オフ
  },
  {
    id: 'enterprise',
    name: 'ビジネス',
    monthlyPrice: 49800,
    yearlyPrice: 29800 * 12, // LPと同じ年額月額: ¥29,800
    monthlyDownloads: 70,
    features: [
      '月間70本ダウンロード',
      '4K解像度対応',
      '商用ライセンス',
      '24時間サポート',
      '新作動画早期アクセス',
      'カスタムリクエスト',
      'API利用可能'
    ],
    monthlyStripePriceId: 
      import.meta.env.VITE_PRICE_ENTERPRISE_MONTHLY || 'price_1QZybdKpWTNKTKELPfRdSLOP',
    yearlyStripePriceId: 
      import.meta.env.VITE_PRICE_ENTERPRISE_YEARLY || 'price_1QZyeRKpWTNKTKELEnterpriseYear',
    yearlyDiscount: 40 // 約40%オフ
  }
];

// Stripe決済処理
export class StripePaymentService {
  private stripe: Promise<Stripe | null>;

  constructor() {
    this.stripe = getStripe();
  }

  // チェックアウトセッションを作成
  async createCheckoutSession(
    planId: string, 
    billing: 'monthly' | 'yearly',
    userId: string,
    successUrl: string = `${window.location.origin}/payment/success`,
    cancelUrl: string = `${window.location.origin}/payment/cancel`
  ): Promise<{ sessionId?: string; error?: string }> {
    try {
      // 開発環境では常にモック処理
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('Mock Stripe checkout session');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { sessionId: 'mock_session_' + Date.now() };
      }

      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        return { error: '無効なプランが選択されました。' };
      }

      const priceId = billing === 'yearly' ? plan.yearlyStripePriceId : plan.monthlyStripePriceId;

      // Vercel Functions経由でStripe APIを呼び出し
      const response = await fetch(`${window.location.origin}/api/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId,
          userId,
          billing,
          planId,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'チェックアウトセッションの作成に失敗しました');
      }

      const { sessionId } = await response.json();
      return { sessionId };
    } catch (error) {
      console.error('Stripe checkout session creation error:', error);
      return { error: error instanceof Error ? error.message : '決済処理でエラーが発生しました' };
    }
  }

  // チェックアウトページにリダイレクト
  async redirectToCheckout(sessionId: string): Promise<{ error?: string }> {
    try {
      // 開発環境では実際のリダイレクトを行わない
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('Mock Stripe redirect, sessionId:', sessionId);
        return {}; // エラーなし
      }

      const stripe = await this.stripe;
      if (!stripe) {
        return { error: 'Stripeの初期化に失敗しました' };
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      return { error: error?.message };
    } catch (error) {
      console.error('Stripe redirect error:', error);
      return { error: error instanceof Error ? error.message : 'リダイレクトに失敗しました' };
    }
  }

  // プラン購入処理
  async subscribeToPlan(planId: string, billing: 'monthly' | 'yearly', userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { sessionId, error } = await this.createCheckoutSession(planId, billing, userId);
      
      if (error) {
        return { success: false, error };
      }

      if (!sessionId) {
        return { success: false, error: 'セッションIDが取得できませんでした' };
      }

      const redirectResult = await this.redirectToCheckout(sessionId);
      if (redirectResult.error) {
        return { success: false, error: redirectResult.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Plan subscription error:', error);
      return { success: false, error: error instanceof Error ? error.message : '購入処理に失敗しました' };
    }
  }

  // カスタマーポータルセッション作成
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string = `${window.location.origin}/mypage`
  ): Promise<{ url?: string; error?: string }> {
    try {
    const response = await fetch(`${window.location.origin}/api/stripe-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerId,
        returnUrl,
      }),
    });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'カスタマーポータルセッションの作成に失敗しました');
      }

      const { url } = await response.json();
      return { url };
    } catch (error) {
      console.error('Customer portal session creation error:', error);
      return { error: error instanceof Error ? error.message : 'カスタマーポータルの作成に失敗しました' };
    }
  }
}

// シングルトンインスタンス
export const stripeService = new StripePaymentService();

// ユーティリティ関数
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(price);
};

export const getPlanById = (planId: string): SubscriptionPlan | undefined => {
  return subscriptionPlans.find(plan => plan.id === planId);
};

export const getMonthlyPrice = (plan: SubscriptionPlan): string => {
  return formatPrice(plan.monthlyPrice);
};

export const getYearlyPrice = (plan: SubscriptionPlan): string => {
  return formatPrice(plan.yearlyPrice);
};

export const getMonthlyPriceFromYearly = (plan: SubscriptionPlan): string => {
  const monthlyFromYearly = Math.round(plan.yearlyPrice / 12);
  return formatPrice(monthlyFromYearly);
};

export const getYearlyDiscount = (plan: SubscriptionPlan): string => {
  if (!plan.yearlyDiscount) return '0%';
  return `${plan.yearlyDiscount}%`;
};

export const getYearlySavings = (plan: SubscriptionPlan): string => {
  const monthlyCost = plan.monthlyPrice * 12;
  const savings = monthlyCost - plan.yearlyPrice;
  return formatPrice(savings);
};

export const getPerVideoPrice = (plan: SubscriptionPlan, billing: 'monthly' | 'yearly' = 'monthly'): string => {
  const price = billing === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice;
  const pricePerVideo = Math.round(price / plan.monthlyDownloads);
  return formatPrice(pricePerVideo);
};
