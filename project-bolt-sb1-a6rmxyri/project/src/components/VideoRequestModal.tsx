import React, { useState } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';

interface VideoRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const VideoRequestModal: React.FC<VideoRequestModalProps> = ({ open, onClose }) => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    bodyType: '',
    background: '',
    scene: '',
    faceDetail: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!open) return null;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      age: '',
      gender: '',
      bodyType: '',
      background: '',
      scene: '',
      faceDetail: '',
      notes: ''
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const requestedAt = new Date().toLocaleString('ja-JP');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('メール送信設定が不足しています (Supabase URL / Anon Key)。');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/send-email`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          to: 'request@ai-creativestock.com',
          subject: `動画リクエスト - ${formData.scene || '新規リクエスト'}`,
          template: 'video_request',
          data: {
            user_id: user?.id ?? null,
            user_email: user?.email ?? null,
            age: formData.age,
            gender: formData.gender,
            body_type: formData.bodyType,
            background: formData.background,
            scene: formData.scene,
            face_detail: formData.faceDetail,
            notes: formData.notes,
            requested_at: requestedAt
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(errorText || '送信に失敗しました');
      }

      setFeedback({
        type: 'success',
        message: 'リクエストを送信しました。担当者よりご連絡いたします。'
      });
      resetForm();

      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('動画リクエスト送信エラー (fetch):', err);

      try {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            to: 'request@ai-creativestock.com',
            subject: `動画リクエスト - ${formData.scene || '新規リクエスト'}`,
            template: 'video_request',
            data: {
              user_id: user?.id ?? null,
              user_email: user?.email ?? null,
              age: formData.age,
              gender: formData.gender,
              body_type: formData.bodyType,
              background: formData.background,
              scene: formData.scene,
              face_detail: formData.faceDetail,
              notes: formData.notes,
              requested_at: new Date().toLocaleString('ja-JP')
            }
          }
        });

        if (error) {
          throw error;
        }

        setFeedback({
          type: 'success',
          message: 'リクエストを送信しました。担当者よりご連絡いたします。'
        });
        resetForm();

        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 1800);
      } catch (fallbackError) {
        console.error('動画リクエスト送信エラー (fallback):', fallbackError);
        setFeedback({
          type: 'error',
          message: '送信に失敗しました。時間をおいて再度お試しください。'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => {
          if (!isSubmitting) {
            resetForm();
            onClose();
            setFeedback(null);
          }
        }}
      />
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl overflow-hidden text-black force-black">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold force-black">動画リクエスト</h2>
            <p className="text-sm text-black mt-1">ご希望の動画イメージを入力してください</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                resetForm();
                onClose();
                setFeedback(null);
              }
            }}
            className="p-2 rounded-full text-black hover:bg-slate-200 transition"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-1">年齢</label>
              <input
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="例: 20代"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">性別</label>
              <input
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                placeholder="例: 女性"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-black mb-1">体型</label>
              <input
                name="bodyType"
                value={formData.bodyType}
                onChange={handleChange}
                placeholder="例: スリム"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1">背景</label>
              <input
                name="background"
                value={formData.background}
                onChange={handleChange}
                placeholder="例: 海辺・夕日"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1">シーン</label>
            <input
              name="scene"
              value={formData.scene}
              onChange={handleChange}
              placeholder="例: カフェで友人と会話"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1">顔の特徴</label>
            <input
              name="faceDetail"
              value={formData.faceDetail}
              onChange={handleChange}
              placeholder="例: 日本人女性・笑顔"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-black mb-1">その他リクエスト</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="その他ご要望があれば入力してください"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
            />
          </div>

          {feedback && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!isSubmitting) {
                    resetForm();
                    onClose();
                    setFeedback(null);
                  }
                }}
                className="px-4 py-2 text-sm font-semibold text-black hover:text-slate-800"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-lg text-sm font-bold text-white transition ${
                  isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                }`}
              >
                {isSubmitting ? '送信中...' : 'リクエストを送信'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VideoRequestModal;
