import React, { useEffect, useMemo, useState } from 'react';
import { Heart, Grid, List, Download, Trash2, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '../hooks/useUser';
import { database, supabase } from '../lib/supabase';
import { getNextDownloadFilename } from '../utils/downloadFilename';
import { downloadFileFromUrl } from '../utils/downloadFile';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'diet' | 'healthcare' | 'business' | 'lifestyle' | 'romance';
  tags: string[];
  duration: number;
  resolution: string;
  file_url: string;
  preview_url?: string;
  original_file_url?: string;
  thumbnail_url: string;
  download_count: number;
  created_at: string;
}

interface FavoriteRecord {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
  video: VideoAsset;
}

interface FavoriteStats {
  totalFavorites: number;
  favoriteCategories: Array<{ category: string; count: number }>;
  averageDuration: number;
  mostRecentFavorite: string;
}

interface UserFavoritesProps {
  onPageChange?: (page: string) => void;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'diet', label: 'Diet' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'business', label: 'Business' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'romance', label: 'Romance' }
] as const;

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'category', label: 'Category' },
  { id: 'duration', label: 'Duration' },
  { id: 'popular', label: 'Most Popular' }
] as const;

type ViewMode = 'grid' | 'list';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

const UserFavorites: React.FC<UserFavoritesProps> = ({ onPageChange = () => {} }) => {
  const {
    user,
    subscription,
    remainingDownloads,
    hasActiveSubscription,
    isTrialUser,
    trialDownloadsRemaining,
    monthlyDownloads,
    refreshUserData
  } = useUser();
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [stats, setStats] = useState<FavoriteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const trialLimit = subscription?.trial_downloads_limit ?? 0;
  const downloadLimit = isTrialUser ? trialLimit : subscription?.monthly_download_limit ?? 0;
  const hasDownloadCap = downloadLimit > 0;
  const safeRemaining = Math.max(0, isTrialUser ? trialDownloadsRemaining : remainingDownloads);
  const canDownloadFromFavorites = Boolean(
    user &&
    hasActiveSubscription &&
    (!hasDownloadCap || safeRemaining > 0)
  );

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setStats(null);
      setLoading(false);
      return;
    }

    void fetchFavorites();
    void fetchStats();
  }, [user]);

  useEffect(() => {
    if (!downloadMessage) return;
    const timer = setTimeout(() => setDownloadMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [downloadMessage]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_favorites')
        .select(
          `
            *,
            video:video_assets(*)
          `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Favorites fetch error:', error);
        return;
      }

      setFavorites((data || []).filter((record) => Boolean(record.video)) as FavoriteRecord[]);
    } catch (err) {
      console.error('Favorites error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(
          `
            created_at,
            video:video_assets(category, duration, title)
          `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error || !data) {
          return;
      }

      const categoryCount: Record<string, number> = {};
      let totalDuration = 0;

      data.forEach((entry) => {
        const category = entry.video?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        totalDuration += entry.video?.duration || 0;
      });

      const favoriteCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalFavorites: data.length,
        favoriteCategories,
        averageDuration: data.length ? Math.round(totalDuration / data.length) : 0,
        mostRecentFavorite: data[0]?.created_at || ''
      });
    } catch (err) {
      console.error('Favorite stats error:', err);
    }
  };

  const filteredFavorites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return favorites
      .filter((record) => {
        const matchesSearch = query
          ? record.video?.title?.toLowerCase().includes(query) ||
            record.video?.tags?.some((tag) => tag.toLowerCase().includes(query))
          : true;
        const matchesCategory = categoryFilter === 'all' || record.video?.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'category':
            return (a.video?.category || '').localeCompare(b.video?.category || '');
          case 'duration':
            return (a.video?.duration || 0) - (b.video?.duration || 0);
          case 'popular':
            return (b.video?.download_count || 0) - (a.video?.download_count || 0);
          default:
            return 0;
        }
      });
  }, [favorites, searchQuery, categoryFilter, sortBy]);

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase.from('user_favorites').delete().eq('id', favoriteId);
      if (error) {
        console.error('Remove favorite error:', error);
        return;
      }
      setFavorites((prev) => prev.filter((favorite) => favorite.id !== favoriteId));
    } catch (err) {
      console.error('Remove favorite error:', err);
    }
  };

  const downloadVideo = async (video: VideoAsset) => {
    if (!user) {
      alert('ダウンロード機能を利用するにはログインが必要です。');
      return;
    }

    if (!hasActiveSubscription) {
      alert('ダウンロードには有料プランが必要です。');
      return;
    }

    if (hasDownloadCap && safeRemaining <= 0) {
      alert('今月のダウンロード上限に達しています。');
      return;
    }

    const downloadUrl = video.original_file_url || video.file_url;
    if (!downloadUrl) {
      alert('ダウンロード可能なファイルが見つかりません。');
      return;
    }

    try {
      await downloadFileFromUrl(downloadUrl, getNextDownloadFilename(downloadUrl));
    } catch (err) {
      console.error('Download error:', err);
      alert('ダウンロードに失敗しました。もう一度お試しください。');
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    let alreadyDownloadedThisMonth = false;
    try {
      const { data: existing } = await supabase
        .from('download_history')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', video.id)
        .gte('downloaded_at', startOfMonth.toISOString())
        .limit(1);
      alreadyDownloadedThisMonth = (existing?.length || 0) > 0;
    } catch (error) {
      console.error('ダウンロード履歴確認に失敗しました:', error);
    }

    if (alreadyDownloadedThisMonth) {
      setDownloadMessage('この動画は今月すでにダウンロード済みです。');
      return;
    }

    try {
      await database.addDownloadHistory(user.id, video.id);
    } catch (err) {
      console.error('ダウンロード履歴の記録に失敗しました:', err);
    }

    await refreshUserData();

    const usageBefore = hasDownloadCap
      ? Math.max(0, downloadLimit - safeRemaining)
      : monthlyDownloads;
    const usageAfter = usageBefore + 1;

    if (hasDownloadCap && downloadLimit > 0) {
      const cappedUsage = Math.min(usageAfter, downloadLimit);
      const remainingAfter = Math.max(downloadLimit - cappedUsage, 0);
      setDownloadMessage(`現在のダウンロード数: ${cappedUsage}/${downloadLimit}本（残り${remainingAfter}本）`);
    } else {
      setDownloadMessage(`今月のダウンロード数: ${usageAfter}本になりました`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">お気に入りを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-gray-400">このページを表示するにはログインが必要です。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Sidebar currentPage="favorites" onPageChange={onPageChange} />
      <div className="ml-0 lg:ml-[260px] px-4 py-8 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-cyan-400" />
                  Favorites
                </p>
                <h1 className="text-3xl font-black">User Favorites</h1>
                <p className="text-sm text-gray-400">気に入った動画をまとめてすばやく管理できます。</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">今月の残りダウンロード</p>
                <p className="text-3xl font-semibold">
                  {remainingDownloads === null ? '∞' : remainingDownloads}
                </p>
              </div>
            </div>

            {stats && (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">総お気に入り数</p>
                  <p className="text-3xl font-semibold mt-1">{stats.totalFavorites}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">平均動画時間</p>
                  <p className="text-3xl font-semibold mt-1">{formatDuration(stats.averageDuration)}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">人気カテゴリ</p>
                  <p className="text-lg font-semibold mt-1">
                    {stats.favoriteCategories[0]?.category || 'N/A'}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">最新登録日</p>
                  <p className="text-lg font-semibold mt-1">
                    {stats.mostRecentFavorite ? formatDate(stats.mostRecentFavorite) : '—'}
                  </p>
                </div>
              </section>
            )}
          </header>

          {downloadMessage && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {downloadMessage}
            </div>
          )}

          <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="お気に入りを検索"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {CATEGORY_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  className={`p-2 rounded-lg border ${
                    viewMode === 'grid' ? 'border-cyan-400 text-cyan-400' : 'border-slate-700 text-slate-400'
                  }`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  className={`p-2 rounded-lg border ${
                    viewMode === 'list' ? 'border-cyan-400 text-cyan-400' : 'border-slate-700 text-slate-400'
                  }`}
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          {filteredFavorites.length === 0 ? (
            <div className="border border-dashed border-white/20 rounded-3xl py-16 text-center text-gray-400">
              条件に一致するお気に入りが見つかりませんでした。
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFavorites.map((favorite) => (
                <article key={favorite.id} className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={favorite.video.thumbnail_url}
                      alt={favorite.video.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="absolute top-3 right-3 bg-white/90 text-slate-900 rounded-full p-2"
                      onClick={() => removeFavorite(favorite.id)}
                      aria-label="お気に入りから削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          {favorite.video.category}
                        </p>
                        <h3 className="text-lg font-semibold text-white">{favorite.video.title}</h3>
                      </div>
                      <span className="text-sm text-gray-400">{formatDuration(favorite.video.duration)}</span>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2">
                      {favorite.video.description || '説明文はまだありません。'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(favorite.video.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        className={`text-sm inline-flex items-center font-semibold transition-colors ${
                          canDownloadFromFavorites
                            ? 'text-cyan-400 hover:text-cyan-200'
                            : 'text-gray-500 cursor-not-allowed opacity-60'
                        }`}
                        onClick={() => downloadVideo(favorite.video)}
                        disabled={!canDownloadFromFavorites}
                      >
                        <Download className="w-4 h-4 inline mr-2" />
                        Download
                      </button>
                      <span className="text-xs text-gray-500">{formatDate(favorite.created_at)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFavorites.map((favorite) => (
                <article
                  key={favorite.id}
                  className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex flex-col md:flex-row"
                >
                  <div className="md:w-1/3 aspect-video md:aspect-auto">
                    <img
                      src={favorite.video.thumbnail_url}
                      alt={favorite.video.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          {favorite.video.category}
                        </p>
                        <h3 className="text-lg font-semibold text-white">{favorite.video.title}</h3>
                      </div>
                      <span className="text-sm text-gray-400">{formatDuration(favorite.video.duration)}</span>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2">
                      {favorite.video.description || '説明文はまだありません。'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(favorite.video.tags || []).slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <div className="text-xs text-gray-500">{formatDate(favorite.created_at)}</div>
                      <div className="flex gap-2">
                        <button
                          className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
                            canDownloadFromFavorites
                              ? 'text-cyan-400 hover:text-cyan-200'
                              : 'text-gray-500 cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => downloadVideo(favorite.video)}
                          disabled={!canDownloadFromFavorites}
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          className="inline-flex items-center gap-2 text-sm text-red-300 hover:text-red-200"
                          onClick={() => removeFavorite(favorite.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserFavorites;
