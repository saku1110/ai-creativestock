import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ContactProps {
  onPageChange: (page: string) => void;
}

export default function Contact({ onPageChange }: ContactProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '【お問い合わせ】' + formData.subject,
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);

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
      const { error } = await (supabase.functions as any).invoke('send-email', {
        body: {
          to: 'support@ai-creative-stock.com',
          subject: '【お問い合わせ】' + formData.subject,
          template: 'contact',
          data: {
            name: formData.name,
            from_email: formData.email,
            message: formData.message,
          },
        },
      });
      if (error) throw error;
      alert('お問い合わせを送信しました。担当よりご連絡いたします。');
      setFormData({ name: '', email: '', subject: '【お問い合わせ】' + formData.subject, message: '' });
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
          繝帙・繝縺ｫ謌ｻ繧・        </button>

        <h1 className="text-4xl font-bold mb-8">縺雁撫縺・粋繧上○</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-8">
            繧ｵ繝ｼ繝薙せ縺ｫ髢｢縺吶ｋ縺碑ｳｪ蝠上√＃隕∵悍縲√◎縺ｮ莉悶♀蝠上＞蜷医ｏ縺帙・縲∽ｻ･荳九・繝輔か繝ｼ繝繧医ｊ縺企√ｊ縺上□縺輔＞縲・          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">繝｡繝ｼ繝ｫ縺ｧ縺ｮ縺雁撫縺・粋繧上○</h2>
              </div>
              <p className="text-gray-300 text-sm">
                騾壼ｸｸ2縲・蝟ｶ讌ｭ譌･莉･蜀・↓縺碑ｿ比ｿ｡縺・◆縺励∪縺吶・              </p>
            </div>

            <div className="bg-gray-900 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-pink-400" />
                <h2 className="text-xl font-semibold">その他の連絡方法</h2>
              </div>
              <p className="text-gray-300 text-sm">
                縺雁撫縺・粋繧上○縺ｮ蜑阪↓縲：AQ繧ゅ＃遒ｺ隱阪￥縺縺輔＞縲・              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                縺雁錐蜑・<span className="text-pink-400">*</span>
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
                繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ <span className="text-pink-400">*</span>
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
                莉ｶ蜷・<span className="text-pink-400">*</span>
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
                縺雁撫縺・粋繧上○蜀・ｮｹ <span className="text-pink-400">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={8}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                placeholder="縺雁撫縺・粋繧上○蜀・ｮｹ繧定ｩｳ縺励￥縺碑ｨ伜・縺上□縺輔＞"
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
              窶ｻ 縺企√ｊ縺・◆縺縺・◆蛟倶ｺｺ諠・ｱ縺ｯ縲√♀蝠上＞蜷医ｏ縺帙∈縺ｮ蝗樒ｭ比ｻ･螟悶・逶ｮ逧・〒縺ｯ菴ｿ逕ｨ縺・◆縺励∪縺帙ｓ縲・
            </p>
            <p className="text-gray-400 text-sm mt-2">AI CreativeStock 驕句霧莠句漁螻</p>
          </div>
        </div>
      </div>
    </div>
  );
}