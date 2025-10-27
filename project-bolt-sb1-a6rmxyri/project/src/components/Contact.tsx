import React from 'react';
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';

interface ContactProps {
  onPageChange: (page: string) => void;
}

export default function Contact({ onPageChange }: ContactProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const [submitting, setSubmitting] = React.useState(false);

  // 初回表示で必ずページ最上部へスクロール
  React.useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('必須項目を入力してください');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(formData.email)) {
      alert('メールアドレスの形式が正しくありません');
      return;
    }
    setSubmitting(true);
    try {
      // 同一オリジンのAPIを呼ぶ（Vercel本番/プレビュー、または vercel dev + Vite proxy）
      const resp = await fetch(`/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          from_email: formData.email,
          subject: formData.subject || 'お問い合わせ',
          message: formData.message,
        }),
      });
      if (!resp.ok) throw new Error('Contact API returned non-2xx');

      // 成功時
      alert('お問い合わせを送信しました。担当よりご連絡いたします。');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      console.error('contact submit error:', err);
      alert('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => onPageChange('landing')}
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          トップに戻る
        </button>

        <h1 className="text-4xl font-bold mb-8">お問い合わせ</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-8">
            製品やサービスに関するご質問、導入のご相談、
            不具合のご報告などがございましたら、下記のフォーム
            からお気軽にお問い合わせください。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">メールでのお問い合わせ</h2>
              </div>
              <p className="text-gray-300 text-sm">
                2営業日以内に担当よりご返信いたします。
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">その他の連絡方法</h2>
              </div>
              <p className="text-gray-300 text-sm">
                緊急のご用件は件名の先頭に【至急】とご記載ください。
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
                placeholder="お名前"
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
                placeholder="件名"
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
                disabled={submitting}
                className="bg-gradient-to-r from-pink-500 to-orange-500 text-white px-12 py-4 rounded-xl font-bold text-lg transition-transform shadow-lg"
              >
                {submitting ? '送信中...' : 'お問い合わせを送信'}
              </button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              送信内容は当社のプライバシーポリシーに基づいて適切に管理いたします。
            </p>
            <p className="text-gray-400 text-sm mt-2">AI Creative Stock サポート窓口</p>
          </div>
        </div>
      </div>
    </div>
  );
}
