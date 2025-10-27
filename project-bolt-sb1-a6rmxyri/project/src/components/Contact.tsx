import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface ContactProps {
  onPageChange: (page: string) => void;
}

export default function Contact({ onPageChange }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('お問い合わせを受け付けました。後ほど担当者よりご連絡いたします。');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => onPageChange('landing')}
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          ホームに戻る
        </button>

        <h1 className="text-4xl font-bold mb-8">お問い合わせ</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-8">
            サービスに関するご質問、ご要望、その他お問い合わせは、以下のフォームよりお送りください。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">メールでのお問い合わせ</h2>
              </div>
              <p className="text-gray-300 text-sm">
                通常2〜3営業日以内にご返信いたします。
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">よくある質問</h2>
              </div>
              <p className="text-gray-300 text-sm">
                お問い合わせの前に、FAQもご確認ください。
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                お名前 <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                メールアドレス <span className="text-pink-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                placeholder="example@example.com"
              />
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                件名 <span className="text-pink-400">*</span>
              </label>
              <input
                type="text"
                id="subject"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                placeholder="お問い合わせの件名"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                お問い合わせ内容 <span className="text-pink-400">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={8}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                placeholder="お問い合わせ内容を詳しくご記入ください"
              />
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-12 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-lg hover:shadow-pink-500/50"
              >
                送信する
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              ※ お送りいただいた個人情報は、お問い合わせへの回答以外の目的では使用いたしません。
            </p>
            <p className="text-gray-400 text-sm mt-2">AI CreativeStock 運営事務局</p>
          </div>
        </div>
      </div>
    </div>
  );
}
