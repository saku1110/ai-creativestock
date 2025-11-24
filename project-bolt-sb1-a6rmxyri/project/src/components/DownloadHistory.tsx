import React, { useEffect, useMemo, useState } from 'react';
import { Download, Grid, List, Search, Filter, Clock } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';
import { getNextDownloadFilename } from '../utils/downloadFilename';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'diet' | 'healthcare' | 'business' | 'lifestyle' | 'romance';
  tags: string[];
  duration: number;
  resolution: string;
  file_url: string;
  thumbnail_url: string;
  download_count: number;
}

interface DownloadRecord {
  id: string;
  video_id: string;
  downloaded_at: string;
  ip_address?: string;
  user_agent?: string;
  video: VideoAsset;
}

interface DownloadStats {
  totalDownloads: number;
  thisMonthDownloads: number;
  favoriteCategory: string;
  averageVideoLength: number;
  mostDownloadedVideo: string;
}

interface DownloadHistoryProps {
  onPageChange?: (page: string) => void;
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All categories' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'diet', label: 'Diet' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'business', label: 'Business' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'romance', label: 'Romance' }
] as const;

const DATE_FILTERS = [
  { id: 'all', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'quarter', label: 'Last 90 days' }
] as const;

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'category', label: 'Category' },
  { id: 'duration', label: 'Duration' },
  { id: 'popular', label: 'Most downloaded' }
] as const;

type ViewMode = 'grid' | 'list';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const DownloadHistory: React.FC<DownloadHistoryProps> = ({ onPageChange = () => {} }) => {
  const { user, hasActiveSubscription } = useUser();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    if (!user) {
      setDownloads([]);
      setStats(null);
      setLoading(false);
      return;
    }

    void fetchDownloadHistory();
    void fetchDownloadStats();
  }, [user]);

  const fetchDownloadHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('download_history')
        .select(
          `
            *,
            video:video_assets(*)
          `
        )
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });

      if (error) {
        console.error('Download history fetch error:', error);
        return;
      }

      setDownloads((data || []).filter((record) => Boolean(record.video)) as DownloadRecord[]);
    } catch (err) {
      console.error('Download history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('download_history')
        .select(
          `
            downloaded_at,
            video:video_assets(category, duration, title, download_count)
          `
        )
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });

      if (error || !data) {
        return;
      }

      const now = new Date();
      const thisMonthDownloads = data.filter((entry) => {
        const downloadedAt = new Date(entry.downloaded_at);
        return downloadedAt.getFullYear() === now.getFullYear() && downloadedAt.getMonth() === now.getMonth();
      }).length;

      const categoryCount: Record<string, number> = {};
      let totalDuration = 0;
      let topVideoTitle = '';
      let topVideoCount = -1;

      data.forEach((entry) => {
        const category = entry.video?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
        totalDuration += entry.video?.duration || 0;

        const downloadCount = entry.video?.download_count ?? 0;
        if (downloadCount > topVideoCount) {
          topVideoCount = downloadCount;
          topVideoTitle = entry.video?.title || 'Untitled';
        }
      });

      const favoriteCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category)[0];

      setStats({
        totalDownloads: data.length,
        thisMonthDownloads,
        favoriteCategory: favoriteCategory || 'N/A',
        averageVideoLength: data.length ? Math.round(totalDuration / data.length) : 0,
        mostDownloadedVideo: topVideoTitle || 'N/A'
      });
    } catch (err) {
      console.error('Download stats error:', err);
    }
  };

  const filteredDownloads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();

    const startDate = (() => {
      switch (dateFilter) {
        case 'today':
          return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'week':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'quarter':
          return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default:
          return null;
      }
    })();

    return downloads
      .filter((record) => {
        const matchesSearch = query
          ? record.video?.title?.toLowerCase().includes(query) ||
            record.video?.tags?.some((tag) => tag.toLowerCase().includes(query))
          : true;
        const matchesCategory = categoryFilter === 'all' || record.video?.category === categoryFilter;
        const matchesDate = startDate ? new Date(record.downloaded_at) >= startDate : true;
        return matchesSearch && matchesCategory && matchesDate;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.downloaded_at).getTime() - new Date(a.downloaded_at).getTime();
          case 'oldest':
            return new Date(a.downloaded_at).getTime() - new Date(b.downloaded_at).getTime();
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
  }, [downloads, searchQuery, categoryFilter, dateFilter, sortBy]);

  const redownload = (record: DownloadRecord) => {
    if (!hasActiveSubscription) {
      alert('ダウンロードには有料プランが必要です。');
      return;
    }

    if (!record.video?.file_url) {
      alert('ダウンロードファイルが見つかりません。');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = record.video.file_url;
      link.download = getNextDownloadFilename(record.video.file_url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Redownload error:', err);
      alert('ダウンロードに失敗しました。時間をおいて再試行してください。');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">ダウンロード履歴を読み込んでいます...</p>
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
      <Sidebar currentPage="downloads" onPageChange={onPageChange} />
      <div className="ml-0 lg:ml-[260px] px-4 py-8 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Download History
                </p>
                <h1 className="text-3xl font-black">Exported Videos</h1>
                <p className="text-sm text-gray-400">これまでに取得した動画をカテゴリや期間で振り返りましょう。</p>
              </div>
              <div className="flex gap-3">
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

            {stats && (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">合計ダウンロード</p>
                  <p className="text-3xl font-semibold mt-1">{stats.totalDownloads}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">今月のダウンロード</p>
                  <p className="text-3xl font-semibold mt-1">{stats.thisMonthDownloads}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">人気カテゴリ</p>
                  <p className="text-lg font-semibold mt-1">{stats.favoriteCategory}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-gray-400">平均動画時間</p>
                  <p className="text-lg font-semibold mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatDuration(stats.averageVideoLength)}
                  </p>
                </div>
              </section>
            )}
          </header>

          <section className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ダウンロード履歴を検索"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
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
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  {DATE_FILTERS.map((option) => (
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
              </div>
            </div>
          </section>

          {filteredDownloads.length === 0 ? (
            <div className="border border-dashed border-white/20 rounded-3xl py-16 text-center text-gray-400">
              該当するダウンロード履歴がありません。
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredDownloads.map((record) => (
                <article key={record.id} className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="relative aspect-video">
                    <img
                      src={record.video.thumbnail_url}
                      alt={record.video.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      className="absolute top-3 right-3 bg-black/80 text-white rounded-full px-4 py-1 text-xs"
                      onClick={() => redownload(record)}
                    >
                      再ダウンロード
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          {record.video.category}
                        </p>
                        <h3 className="text-lg font-semibold text-white">{record.video.title}</h3>
                      </div>
                      <span className="text-sm text-gray-400">{formatDuration(record.video.duration)}</span>
                    </div>

                    <p className="text-sm text-gray-400 line-clamp-2">
                      {record.video.description || '説明文はまだ登録されていません。'}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(record.video.tags || []).slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDateTime(record.downloaded_at)}</span>
                      <button
                        className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-200 text-sm"
                        onClick={() => redownload(record)}
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDownloads.map((record) => (
                <article
                  key={record.id}
                  className="rounded-3xl bg-white/5 border border-white/10 overflow-hidden flex flex-col md:flex-row"
                >
                  <div className="md:w-1/3 aspect-video md:aspect-auto">
                    <img
                      src={record.video.thumbnail_url}
                      alt={record.video.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          {record.video.category}
                        </p>
                        <h3 className="text-xl font-semibold text-white">{record.video.title}</h3>
                      </div>
                      <span className="text-sm text-gray-400">{formatDuration(record.video.duration)}</span>
                    </div>

                    <p className="text-sm text-gray-400">{record.video.description || '説明文はまだ登録されていません。'}</p>

                    <div className="flex flex-wrap gap-2">
                      {(record.video.tags || []).slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-sm text-gray-400">
                      <span>{formatDateTime(record.downloaded_at)}</span>
                      <div className="flex gap-3">
                        <button
                          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-200"
                          onClick={() => redownload(record)}
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        {record.video.resolution && (
                          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-white/10 border border-white/10">
                            <Filter className="w-3 h-3" />
                            {record.video.resolution}
                          </span>
                        )}
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

export default DownloadHistory;
