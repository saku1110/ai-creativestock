import React, { useState } from 'react';
import { X, Mail, Phone, User, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'お名前を入力してください';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'お問い合わせ内容を選択してください';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'メッセージを入力してください';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'メッセージは10文字以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 実際のプロジェクトでは、ここでサーバーAPIを呼び出し
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitStatus('success');
      
      // 3秒後にモーダルを閉じる
      setTimeout(() => {
        onClose();
        setSubmitStatus('idle');
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          subject: '',
          message: ''
        });
      }, 3000);
      
    } catch (error) {
      setSubmitStatus('error');
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative glass-dark rounded-3xl border border-white/20 p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">お問い合わせ</h2>
              <p className="text-sm text-gray-400">お気軽にご相談ください</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 送信完了状態 */}
        {submitStatus === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              送信完了
            </h3>
            <p className="text-gray-400 mb-6">
              お問い合わせありがとうございます。
              <br />
              担当者より24時間以内にご連絡いたします。
            </p>
            <div className="glass-effect rounded-2xl p-4 border border-green-400/30">
              <p className="text-green-400 font-bold text-sm">
                自動的にウィンドウが閉じます...
              </p>
            </div>
          </div>
        )}

        {/* エラー状態 */}
        {submitStatus === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              送信エラー
            </h3>
            <p className="text-gray-400 mb-6">
              送信に失敗しました。
              <br />
              しばらく時間をおいて再度お試しください。
            </p>
            <div className="glass-effect rounded-2xl p-4 border border-red-400/30">
              <p className="text-red-400 font-bold text-sm">
                もう一度お試しください
              </p>
            </div>
          </div>
        )}

        {/* フォーム */}
        {submitStatus === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お名前 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                お名前 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                    errors.name ? 'border-red-400' : 'border-white/10'
                  }`}
                  placeholder="山田太郎"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                メールアドレス <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border ${
                    errors.email ? 'border-red-400' : 'border-white/10'
                  }`}
                  placeholder="example@gmail.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* 電話番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                電話番号
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border border-white/10"
                  placeholder="090-1234-5678"
                />
              </div>
            </div>

            {/* 会社名 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                会社名・組織名
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full pl-4 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border border-white/10"
                placeholder="株式会社サンプル"
              />
            </div>

            {/* お問い合わせ内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                お問い合わせ内容 <span className="text-red-400">*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`w-full pl-4 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white bg-black border ${
                  errors.subject ? 'border-red-400' : 'border-white/10'
                }`}
              >
                <option value="" className="bg-black">選択してください</option>
                <option value="pricing" className="bg-black">料金プランについて</option>
                <option value="demo" className="bg-black">デモ・トライアルについて</option>
                <option value="features" className="bg-black">機能・サービス内容について</option>
                <option value="technical" className="bg-black">技術的な質問</option>
                <option value="partnership" className="bg-black">パートナーシップについて</option>
                <option value="other" className="bg-black">その他</option>
              </select>
              {errors.subject && (
                <p className="mt-1 text-sm text-red-400">{errors.subject}</p>
              )}
            </div>

            {/* メッセージ */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                メッセージ <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 text-gray-400 w-5 h-5" />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={5}
                  className={`w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border resize-none ${
                    errors.message ? 'border-red-400' : 'border-white/10'
                  }`}
                  placeholder="お問い合わせ内容を詳しくお聞かせください..."
                />
              </div>
              {errors.message && (
                <p className="mt-1 text-sm text-red-400">{errors.message}</p>
              )}
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
                isSubmitting 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'cyber-button text-white hover:shadow-cyan-500/25'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>送信中...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>お問い合わせを送信</span>
                </>
              )}
            </button>

            {/* 注意事項 */}
            <div className="glass-effect rounded-2xl p-4 border border-cyan-400/30">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-bold text-sm">お問い合わせについて</span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• 担当者より24時間以内にご連絡いたします</li>
                <li>• 土日祝日の場合は翌営業日のご連絡となります</li>
                <li>• お急ぎの場合はお電話でお問い合わせください</li>
                <li>• 個人情報は適切に管理し、お問い合わせ対応以外には使用いたしません</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactModal;