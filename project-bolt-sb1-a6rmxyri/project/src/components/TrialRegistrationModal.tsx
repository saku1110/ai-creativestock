import React, { useState } from 'react';
import { X, CreditCard, Shield, CheckCircle, AlertCircle, Calendar, User, Mail, Lock, Crown, Zap } from 'lucide-react';
import { stripeService, subscriptionPlans } from '../lib/stripe';
import { auth } from '../lib/supabase';

interface NewRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistrationSuccess: (userData: any) => void;
  onAuthSuccess: (userData: any) => void;
}

// スタータープランの定義
const trialPlan = {
  id: 'trial',
  name: 'スタータープラン',
  monthlyPrice: 0,
  trialDays: 7,
  monthlyDownloads: 3,
  features: [
    '初回利用期間7日',
    '3本ダウンロード',
    '4K解像度対応',
    '基本ライセンス'
  ],
  popular: false,
  color: 'from-green-500 to-emerald-600'
};

const NewRegistrationModal: React.FC<NewRegistrationModalProps> = ({
  isOpen,
  onClose,
  onRegistrationSuccess,
  onAuthSuccess
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    selectedPlan: 'trial'
  });
  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);


  const validateStep1 = () => {
    const newErrors: any = {};
    
    if (!formData.email) newErrors.email = 'メールアドレスは必須です';
    if (!formData.password) newErrors.password = 'パスワードは必須です';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
    }
    if (!formData.name) newErrors.name = '名前は必須です';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: any = {};
    
    if (!formData.selectedPlan) newErrors.selectedPlan = 'プランを選択してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: any = {};
    
    if (!formData.cardNumber) newErrors.cardNumber = 'カード番号は必須です';
    if (!formData.expiryDate) newErrors.expiryDate = '有効期限は必須です';
    if (!formData.cvv) newErrors.cvv = 'CVVは必須です';
    if (!formData.cardholderName) newErrors.cardholderName = 'カード名義は必須です';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Google認証での登録
  const handleGoogleRegistration = async () => {
    try {
      setIsLoading(true);
      console.log('新規登録用Google認証を開始');
      
      const { error } = await auth.signUpWithGoogle(); // 新規登録用関数を使用
      if (error) {
        setErrors({ general: 'Google認証に失敗しました: ' + error.message });
        console.error('Google認証エラー:', error);
      } else {
        console.log('Google認証リダイレクト開始（mode=registration）');
        // リダイレクトが開始されるため、以降の処理は実行されない
      }
    } catch (error) {
      console.error('Google認証例外:', error);
      setErrors({ general: 'Google認証でエラーが発生しました' });
    } finally {
      setIsLoading(false);
    }
  };

  // Apple認証は廃止しました

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      // スタータープランの場合はクレカ情報をスキップしてログイン
      if (formData.selectedPlan === 'trial') {
        setStep(4); // 登録完了画面へ
      } else {
        setStep(3); // クレカ情報入力へ
      }
    }
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Step 3 Submit started');
    console.log('Form data:', { ...formData, cardNumber: '****', cvv: '***' });
    
    if (!validateStep3()) {
      console.log('Validation failed');
      return;
    }

    setIsLoading(true);
    setErrors({}); // エラーをクリア
    
    try {
      console.log('Step 3 Payment processing started');
      console.log('Selected plan:', formData.selectedPlan);
      
      // 開発環境またはモック処理
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('Using mock payment processing');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 登録完了画面に移動
        setStep(4);
        return;
      }

      // 本番環境でのStripe決済処理
      console.log('Using production Stripe flow');
      
      const userId = 'user_' + Date.now();
      
      console.log('Creating checkout session...');
      const result = await stripeService.createCheckoutSession(
        formData.selectedPlan,
        'monthly',
        userId,
        `${window.location.origin}/registration/success`,
        `${window.location.origin}/registration/cancel`
      );

      console.log('Checkout session result:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.sessionId) {
        console.log('Redirecting to Stripe checkout...');
        const redirectResult = await stripeService.redirectToCheckout(result.sessionId);
        if (redirectResult.error) {
          throw new Error(redirectResult.error);
        }
      } else {
        throw new Error('Stripe session IDの取得に失敗しました');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setErrors({ general: `お支払い処理に失敗しました: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass-dark rounded-2xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {step === 1 && 'アカウント作成'}
            {step === 2 && 'プラン選択'}
            {step === 3 && 'お支払い情報'}
            {step === 4 && '登録完了'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* ステップ1: アカウント情報 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">新規登録</h3>
                <p className="text-gray-400">
                  AI Creative Stockへようこそ！アカウントを作成しましょう
                </p>
              </div>

              {/* ソーシャルログイン登録 */}
              <div className="space-y-4 mb-6">
                <p className="text-center text-gray-400 text-sm">Googleでかんたん登録</p>
                
                {/* Googleログインボタン */}
                <button
                  type="button"
                  onClick={handleGoogleRegistration}
                  className="w-full flex items-center justify-center space-x-3 glass-effect border border-white/20 text-white hover:text-cyan-400 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:bg-white/5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Googleで新規登録</span>
                </button>

                {/* Apple IDログインボタンは削除しました */}
              </div>

              <div className="text-center">
                <span className="text-gray-500 text-sm">または</span>
              </div>

              {/* 手動入力フォーム */}
              <form onSubmit={handleStep1Submit} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    名前 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="山田太郎"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    会社名（任意）
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="株式会社〇〇"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  メールアドレス *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    <Lock className="w-4 h-4 inline mr-2" />
                    パスワード *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="8文字以上"
                  />
                  {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    パスワード確認 *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="パスワードを再入力"
                  />
                  {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              <button
                type="submit"
                className="w-full cyber-button text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
              >
                次のステップへ
              </button>
              </form>
            </div>
          )}

          {/* ステップ2: プラン選択 */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">プランを選択してください</h3>
                <p className="text-gray-400">
                  あなたに最適なプランをお選びください。いつでも変更可能です。
                </p>
              </div>

              {/* プラン選択 */}
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* スタータープラン */}
                  <div
                    className={`relative glass-effect border-2 rounded-xl p-6 cursor-pointer transition-all ${
                      formData.selectedPlan === 'trial'
                        ? 'border-green-400 shadow-green-500/25'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    onClick={() => setFormData({ ...formData, selectedPlan: 'trial' })}
                  >
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                        おすすめ
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Crown className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-white font-bold text-lg mb-2">{trialPlan.name}</h4>
                      <p className="text-3xl font-black text-green-400 mb-1">
                        ¥0
                        <span className="text-sm text-gray-400 ml-1">/ {trialPlan.trialDays}日間</span>
                      </p>
                      <p className="text-sm text-gray-400 mb-4">クレジットカード不要</p>
                      <ul className="text-sm text-gray-300 space-y-2 text-left">
                        {trialPlan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 有料プラン */}
                  {subscriptionPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative glass-effect border-2 rounded-xl p-6 cursor-pointer transition-all ${
                        formData.selectedPlan === plan.id
                          ? 'border-cyan-400 shadow-cyan-500/25'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      onClick={() => setFormData({ ...formData, selectedPlan: plan.id })}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                            人気
                          </div>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-2">{plan.name}</h4>
                        <p className="text-3xl font-black text-white mb-1">
                          {formatPrice(plan.monthlyPrice)}
                          <span className="text-sm text-gray-400">/月</span>
                        </p>
                        <p className="text-sm text-gray-400 mb-4">いつでもキャンセル可能</p>
                        <ul className="text-sm text-gray-300 space-y-2 text-left">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-cyan-400 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl font-bold transition-all"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  className="flex-1 cyber-button text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
                >
                  {formData.selectedPlan === 'trial' ? 'スタータープランで始める' : '次のステップへ'}
                </button>
              </div>
            </form>
          )}

          {/* ステップ3: お支払い情報 */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">お支払い情報</h3>
                <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-4 py-3 rounded-xl">
                  <Shield className="w-5 h-5 inline mr-2" />
                  初回利用期間終了後に自動課金が開始されます。いつでもキャンセル可能です。
                </div>
              </div>

              {/* 選択したプランの表示 */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-2">選択したプラン</h3>
                {(() => {
                  const selectedPlan = subscriptionPlans.find(p => p.id === formData.selectedPlan);
                  return selectedPlan ? (
                    <div className="glass-effect border border-cyan-400/50 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-white font-bold">{selectedPlan.name}</h4>
                          <p className="text-gray-400 text-sm">{selectedPlan.features.slice(0, 2).join(', ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-white">
                            {formatPrice(selectedPlan.monthlyPrice)}
                            <span className="text-sm text-gray-400">/月</span>
                          </p>
                          <p className="text-sm text-green-400">初回期間: {trialPlan.trialDays}日</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* カード情報 */}
              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  カード番号 *
                </label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                  className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  placeholder="1234 5678 9012 3456"
                />
                {errors.cardNumber && <p className="text-red-400 text-sm mt-1">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    有効期限 *
                  </label>
                  <input
                    type="text"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="MM/YY"
                  />
                  {errors.expiryDate && <p className="text-red-400 text-sm mt-1">{errors.expiryDate}</p>}
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    CVV *
                  </label>
                  <input
                    type="text"
                    value={formData.cvv}
                    onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                    className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                    placeholder="123"
                  />
                  {errors.cvv && <p className="text-red-400 text-sm mt-1">{errors.cvv}</p>}
                </div>
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-2">
                  カード名義 *
                </label>
                <input
                  type="text"
                  value={formData.cardholderName}
                  onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
                  className="w-full glass-effect border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
                  placeholder="YAMADA TARO"
                />
                {errors.cardholderName && <p className="text-red-400 text-sm mt-1">{errors.cardholderName}</p>}
              </div>

              {errors.general && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl">
                  <AlertCircle className="w-5 h-5 inline mr-2" />
                  {errors.general}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl font-bold transition-all"
                >
                  戻る
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 cyber-button text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 disabled:opacity-50"
                >
                  {isLoading ? '処理中...' : 'お支払い情報を登録'}
                </button>
              </div>
            </form>
          )}

          {/* ステップ4: 完了 */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                登録完了！
              </h3>
              {formData.selectedPlan === 'trial' ? (
                <div>
                  <p className="text-gray-400 mb-6">
                    スタータープランが開始されました。<br />
                    3本の動画をダウンロードできます。
                  </p>
                  <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl mb-6">
                    <Crown className="w-5 h-5 inline mr-2" />
                    クレジットカード登録なしで今すぐ利用開始
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-6">
                    ご登録ありがとうございます。<br />
                    契約内容に基づき自動的に課金が開始されます。
                  </p>
                  <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-4 py-3 rounded-xl mb-6">
                    <Shield className="w-5 h-5 inline mr-2" />
                    初回請求予定日: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              )}
              <button
                onClick={handleLoginAfterRegistration}
                className="cyber-button text-white py-3 px-8 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
              >
                ログインしてダッシュボードへ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

  // 登録完了後のログイン処理
  const handleLoginAfterRegistration = async () => {
    try {
      if (formData.selectedPlan === 'trial') {
        // スタータープランの場合は即座にログイン状態にする
        const mockUserData = {
          id: 'trial_user_' + Date.now(),
          email: formData.email || 'trial@example.com',
          user_metadata: {
            name: formData.name || '新規ユーザー',
            full_name: formData.name || '新規ユーザー'
          },
          subscription: {
            plan: 'trial',
            status: 'trial',
            trial_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            trial_downloads_used: 0,
            trial_downloads_limit: 3
          }
        };
        onRegistrationSuccess(mockUserData);
      } else {
        // 有料プランの場合は実際の登録データを使用
        onRegistrationSuccess({
          email: formData.email,
          name: formData.name,
          selectedPlan: formData.selectedPlan
        });
      }
      onClose();
    } catch (error) {
      console.error('ログイン処理エラー:', error);
      setErrors({ general: 'ログイン処理でエラーが発生しました' });
    }
  };

export default NewRegistrationModal;
