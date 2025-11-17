import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Clock,
  Video as VideoIcon,
  Edit3
} from 'lucide-react';
import { database } from '../lib/supabase';
import { useAdmin } from '../hooks/useAdmin';
import { useUser } from '../hooks/useUser';
import type { StagingVideo } from '../types';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface EditState {
  title: string;
  description: string;
  category: string;
  tagsText: string;
  duration: string;
  resolution: string;
  beautySubCategory: string;
}

const CATEGORY_OPTIONS = [
  { id: 'beauty', label: '美容' },
  { id: 'diet', label: 'ダイエット' },
  { id: 'business', label: 'ビジネス' },
  { id: 'lifestyle', label: 'ライフスタイル' },
  { id: 'romance', label: '恋愛' },
  { id: 'pet', label: 'ペット' }
];

const BEAUTY_SUBCATEGORY_OPTIONS = [
  { id: 'skincare', label: 'スキンケア' },
  { id: 'haircare', label: 'ヘアケア' },
  { id: 'oralcare', label: 'オーラルケア' }
];

const STATUS_META: Record<Exclude<StatusFilter, 'all'>, { label: string; bg: string; text: string }> = {
  pending: { label: '承認待ち', bg: 'bg-amber-500/15 border border-amber-500/30', text: 'text-amber-200' },
  approved: { label: '承認済み', bg: 'bg-emerald-500/15 border border-emerald-500/30', text: 'text-emerald-200' },
  rejected: { label: '差戻し', bg: 'bg-rose-500/15 border border-rose-500/30', text: 'text-rose-200' }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return value;
  }
};

const AdminStagingReview: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useUser();

  const [videos, setVideos] = useState<StagingVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editState, setEditState] = useState<Record<string, EditState>>({});
  const [actionState, setActionState] = useState<Record<string, 'approve' | 'reject' | null>>({});

  const initializeEditState = useCallback((items: StagingVideo[]) => {
    setEditState((prev) => {
      const next = { ...prev };
      items.forEach((video) => {
        if (!video.id || next[video.id]) return;
        const tags = Array.isArray(video.tags)
          ? video.tags.join(', ')
          : typeof video.tags === 'string'
            ? video.tags
            : '';
        next[video.id] = {
          title: video.title || '',
          description: video.description || '',
          category: video.category || 'beauty',
          tagsText: tags,
          duration: video.duration ? String(video.duration) : '',
          resolution: video.resolution || '1920x1080',
          beautySubCategory: (video.beauty_sub_category as string) || 'skincare'
        };
      });
      return next;
    });
  }, []);

  const loadStagingVideos = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);

    const { data, error } = await database.getStagingVideos();
    if (error) {
      setFeedback({ type: 'error', message: error.message || 'ステージング動画の取得に失敗しました' });
      setVideos([]);
    } else {
      const list = Array.isArray(data) ? data : [];
      setVideos(list);
      initializeEditState(list);
    }

    setIsLoading(false);
  }, [initializeEditState]);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      loadStagingVideos();
    }
  }, [adminLoading, isAdmin, loadStagingVideos]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleFieldChange = useCallback((id: string, field: keyof EditState, value: string) => {
    setEditState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  }, []);

  const safeTagsArray = (value: string) =>
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      if (statusFilter !== 'all' && video.status && video.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const target = [
          video.title,
          video.description,
          video.category,
          Array.isArray(video.tags) ? video.tags.join(' ') : typeof video.tags === 'string' ? video.tags : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return target.includes(q);
      }
      return true;
    });
  }, [videos, statusFilter, searchTerm]);

  const handleApprove = useCallback(
    async (video: StagingVideo) => {
      if (!video.id) return;
      const form = editState[video.id];
      setActionState((prev) => ({ ...prev, [video.id]: 'approve' }));

      const { error } = await database.approveStagingVideo(video.id, {
        reviewerId: user?.id,
        title: form?.title || video.title || '',
        description: form?.description ?? video.description ?? '',
        category: form?.category || video.category || 'uncategorized',
        tags: safeTagsArray(form?.tagsText || ''),
        duration: form?.duration ? Number(form.duration) : video.duration,
        resolution: form?.resolution || video.resolution,
        beautySubCategory:
          (form?.category || video.category) === 'beauty'
            ? (form?.beautySubCategory as any) || (video.beauty_sub_category as any) || null
            : null
      });

      if (error) {
        setFeedback({ type: 'error', message: error.message || '承認処理に失敗しました' });
      } else {
        setFeedback({ type: 'success', message: '動画を承認し、本番ライブラリへ反映しました' });
        await loadStagingVideos();
      }

      setActionState((prev) => ({ ...prev, [video.id]: null }));
    },
    [editState, user?.id, loadStagingVideos]
  );

  const handleReject = useCallback(
    async (video: StagingVideo) => {
      if (!video.id) return;
      const reason = window.prompt('差戻し理由を入力してください（省略可）', '');
      if (reason === null) return;

      setActionState((prev) => ({ ...prev, [video.id]: 'reject' }));

      const { error } = await database.rejectStagingVideo(video.id, reason || '', user?.id);

      if (error) {
        setFeedback({ type: 'error', message: error.message || '差戻し処理に失敗しました' });
      } else {
        setFeedback({ type: 'success', message: '動画を差戻しました' });
        await loadStagingVideos();
      }

      setActionState((prev) => ({ ...prev, [video.id]: null }));
    },
    [user?.id, loadStagingVideos]
  );

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center space-x-3 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>管理者情報を確認中...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-10 text-center max-w-lg">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">アクセスが制限されています</h2>
          <p className="text-gray-400 leading-relaxed">
            このページは管理者のみが利用できます。管理者権限をお持ちの場合は、サポートまでご連絡ください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ステージング動画の承認</h1>
            <p className="text-gray-400 mt-2">
              自動生成された動画を確認し、本番ライブラリへ公開するか差戻します。
            </p>
          </div>
          <button
            onClick={loadStagingVideos}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/10"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            最新状態を取得
          </button>
        </header>

        {feedback && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}

        <section className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex flex-wrap items-center gap-2">
                {(['pending', 'approved', 'rejected', 'all'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      statusFilter === status ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'bg-black/30 text-gray-400 hover:text-white'
                    }`}
                  >
                    {status === 'pending'
                      ? '承認待ち'
                      : status === 'approved'
                        ? '承認済み'
                        : status === 'rejected'
                          ? '差戻し'
                          : 'すべて'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-2 w-full lg:w-80">
              <Search className="w-4 h-4 text-gray-500 mr-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="タイトル・タグで絞り込み"
                className="bg-transparent flex-1 text-sm outline-none placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="grid gap-6">
            {isLoading && (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                ステージング動画を読み込み中...
              </div>
            )}

            {!isLoading && filteredVideos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <VideoIcon className="w-12 h-12 mb-4 text-gray-600" />
                <p className="text-lg font-medium">該当する動画がありません</p>
                <p className="text-sm text-gray-500 mt-2">フィルター条件を変更するか、生成が完了するまでお待ちください。</p>
              </div>
            )}

            {!isLoading &&
              filteredVideos.map((video) => {
                const form = editState[video.id ?? ''] || {
                  title: video.title || '',
                  description: video.description || '',
                  category: video.category || 'beauty',
                  tagsText: '',
                  duration: video.duration ? String(video.duration) : '',
                  resolution: video.resolution || '1920x1080',
                  beautySubCategory: 'skincare'
                };
                const status = (video.status as Exclude<StatusFilter, 'all'>) || 'pending';
                const statusStyle = STATUS_META[status] || STATUS_META.pending;
                const isBusy = actionState[video.id ?? ''] != null;

                return (
                  <article
                    key={video.id}
                    className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/30"
                  >
                    <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/5 bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/40">
                          <VideoIcon className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold leading-tight">
                            {form.title || 'タイトル未設定'}
                          </h2>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(video.created_at)}
                            </span>
                            {video.approved_at && (
                              <span>承認: {formatDate(video.approved_at)}</span>
                            )}
                            {video.rejection_reason && (
                              <span className="text-rose-300">差戻し理由: {video.rejection_reason}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                    </header>

                    <div className="grid md:grid-cols-2 gap-6 p-6">
                      <div className="space-y-4">
                        <div className="relative aspect-[9/16] bg-black/60 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                          {video.file_url ? (
                            <video
                              key={video.file_url}
                              src={video.file_url}
                              controls
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-gray-500 text-sm flex flex-col items-center">
                              <VideoIcon className="w-8 h-8 mb-2" />
                              動画プレビューが利用できません
                            </div>
                          )}
                        </div>

                        <div className="grid gap-3 text-sm text-gray-300 bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">ステージングパス</span>
                            <span className="font-mono text-xs truncate max-w-[60%]">{video.storage_path || video.staging_path || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">解像度</span>
                            <span>{form.resolution || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">長さ(秒)</span>
                            <span>{form.duration || video.duration || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="block">
                          <span className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                            <Edit3 className="w-4 h-4" />
                            タイトル
                          </span>
                          <input
                            value={form.title}
                            onChange={(e) => handleFieldChange(video.id as string, 'title', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm text-gray-300 mb-1 block">説明</span>
                          <textarea
                            value={form.description}
                            onChange={(e) => handleFieldChange(video.id as string, 'description', e.target.value)}
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 resize-none"
                          />
                        </label>

                        <div className="grid md:grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-sm text-gray-300 mb-1 block">カテゴリ</span>
                            <select
                              value={form.category}
                              onChange={(e) => handleFieldChange(video.id as string, 'category', e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                            >
                              {CATEGORY_OPTIONS.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          {form.category === 'beauty' && (
                            <label className="block">
                              <span className="text-sm text-gray-300 mb-1 block">美容サブカテゴリ</span>
                              <select
                                value={form.beautySubCategory}
                                onChange={(e) => handleFieldChange(video.id as string, 'beautySubCategory', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                              >
                                {BEAUTY_SUBCATEGORY_OPTIONS.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-sm text-gray-300 mb-1 block">解像度</span>
                            <input
                              value={form.resolution}
                              onChange={(e) => handleFieldChange(video.id as string, 'resolution', e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                              placeholder="例: 1920x1080"
                            />
                          </label>

                          <label className="block">
                            <span className="text-sm text-gray-300 mb-1 block">動画長 (秒)</span>
                            <input
                              type="number"
                              min={1}
                              value={form.duration}
                              onChange={(e) => handleFieldChange(video.id as string, 'duration', e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                            />
                          </label>
                        </div>

                        <label className="block">
                          <span className="text-sm text-gray-300 mb-1 block">タグ（カンマ区切り）</span>
                          <input
                            value={form.tagsText}
                            onChange={(e) => handleFieldChange(video.id as string, 'tagsText', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                            placeholder="例: beauty, skincare, sample"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {safeTagsArray(form.tagsText).map((tag) => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-xs text-gray-200 border border-white/10">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {status === 'pending' && (
                      <footer className="flex flex-col md:flex-row justify-between gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
                        <div className="text-xs text-gray-500">
                          確認後に承認すると本番ライブラリに公開されます。問題があれば差戻してください。
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleReject(video)}
                            disabled={isBusy}
                            className="inline-flex items-center px-4 py-2 rounded-xl border border-rose-500/40 text-rose-200 hover:bg-rose-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionState[video.id ?? ''] === 'reject' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                            差戻す
                          </button>
                          <button
                            onClick={() => handleApprove(video)}
                            disabled={isBusy}
                            className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionState[video.id ?? ''] === 'approve' ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            承認して公開
                          </button>
                        </div>
                      </footer>
                    )}
                  </article>
                );
              })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminStagingReview;
