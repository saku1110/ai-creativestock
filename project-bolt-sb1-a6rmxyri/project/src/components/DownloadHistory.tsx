import React, { useState, useEffect } from 'react';
import { Download, Calendar, Clock, Eye, Star, TrendingUp, Filter, Search, ExternalLink, Trash2 } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';
import Sidebar from './Sidebar';
import { getNextDownloadFilename } from '../utils/downloadFilename';

interface DownloadRecord {
  id: string;
  video_id: string;
  downloaded_at: string;
  ip_address?: string;
  user_agent?: string;
  video: {
    id: string;
    title: string;
    description: string;
    category: string;
    tags: string[];
    duration: number;
    resolution: string;
    thumbnail_url: string;
    file_url: string;
    download_count: number;
  };
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

const DownloadHistory: React.FC<DownloadHistoryProps> = ({ onPageChange = () => {} }) => {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [sortBy, setSortBy] = useState('newest');
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<any>(null);
  const { user } = useUser();

  const categories = [
    { id: 'all', name: '全て' },
    { id: 'beauty', name: '美容' },
    { id: 'fitness', name: 'フィットネス' },
    { id: 'haircare', name: 'ヘアケア' },
    { id: 'business', name: 'ビジネス' },
    { id: 'lifestyle', name: 'ライフスタイル' }
  ];

  const dateFilters = [
    { id: 'all', name: '全期間' },
    { id: 'today', name: '今日' },
    { id: 'week', name: '今週' },
    { id: 'month', name: '今月' },
    { id: 'quarter', name: '過去3ヶ月' }
  ];

  const sortOptions = [
    { id: 'newest', name: '最新順' },
    { id: 'oldest', name: '古い順' },
    { id: 'category', name: 'カテゴリ順' },
    { id: 'duration', name: '動画時間順' },
    { id: 'popular', name: '人気順' }
  ];

  useEffect(() => {
    if (user) {
      fetchDownloadHistory();
      fetchDownloadStats();
    }
  }, [user]);

  const fetchDownloadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await database
        .from('download_history')
        .select(`
          *,
          video:video_assets(*)
        `)
        .eq('user_id', user!.id)
        .order('downloaded_at', { ascending: false });

      if (error) {
        console.error('Download history fetch error:', error);
        return;
      }

      setDownloads(data || []);
    } catch (error) {
      console.error('Download history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDownloadStats = async () => {
    try {
      const { data, error } = await database
        .from('download_history')
        .select(`
          downloaded_at,
          video:video_assets(category, duration, title, download_count)
        `)
        .eq('user_id', user!.id);

      if (error || !data) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthDownloads = data.filter(d => 
        new Date(d.downloaded_at) >= startOfMonth
      ).length;

      // カテゴリ別ダウンロード数を集計
      const categoryCount: Record<string, number> = {};
      data.forEach(d => {
        const category = d.video?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const favoriteCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'なし';

      // 平均動画時間
      const totalDuration = data.reduce((sum, d) => sum + (d.video?.duration || 0), 0);
      const averageVideoLength = data.length > 0 ? Math.round(totalDuration / data.length) : 0;

      // 最もダウンロードした動画
      const videoCount: Record<string, number> = {};
      data.forEach(d => {
        const title = d.video?.title || 'unknown';
        videoCount[title] = (videoCount[title] || 0) + 1;
      });

      const mostDownloadedVideo = Object.entries(videoCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'なし';

      setStats({
        totalDownloads: data.length,
        thisMonthDownloads,
        favoriteCategory: getCategoryName(favoriteCategory),
        averageVideoLength,
        mostDownloadedVideo
      });
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // フィルターとソート
  const filteredDownloads = downloads
    .filter(download => {
      // 検索フィルター
      const searchMatch = !searchQuery || 
        download.video?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        download.video?.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // カテゴリフィルター
      const categoryMatch = categoryFilter === 'all' || download.video?.category === categoryFilter;
      
      // 日付フィルター
      const downloadDate = new Date(download.downloaded_at);
      const now = new Date();
      let dateMatch = true;
      
      switch (dateFilter) {
        case 'today':
          dateMatch = downloadDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateMatch = downloadDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateMatch = downloadDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateMatch = downloadDate >= quarterAgo;
          break;
      }
      
      return searchMatch && categoryMatch && dateMatch;
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

  const redownloadVideo = async (download: DownloadRecord) => {
    try {
      // 実際のダウンロード処理
      const link = document.createElement('a');
      link.href = download.video.file_url;
      link.download = getNextDownloadFilename(download.video.file_url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 新しいダウンロード記録を追加
      await database
        .from('download_history')
        .insert([{
          user_id: user!.id,
          video_id: download.video_id,
          ip_address: null,
          user_agent: navigator.userAgent
        }]);

      // 履歴を更新
      fetchDownloadHistory();
      fetchDownloadStats();
    } catch (error) {
      console.error('Redownload error:', error);
      alert('再ダウンロードに失敗しました。');
    }
  };

  const deleteDownloadRecord = async (downloadId: string) => {
    if (!confirm('この履歴を削除しますか？')) return;

    try {
      const { error } = await database
        .from('download_history')
        .delete()
        .eq('id', downloadId)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Delete error:', error);
        alert('削除に失敗しました。');
        return;
      }

      // 履歴を更新
      fetchDownloadHistory();
      fetchDownloadStats();
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除に失敗しました。');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">ダウンロード履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#ffffff' }}>
      {/* サイドバー */}
      <Sidebar currentPage="download-history" onPageChange={onPageChange} />
      
      {/* メインコンテンツ */}
      <div style={{ marginLeft: '260px', padding: '20px 30px' }}>
        <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4">
            <span className="gradient-text">ダウンロード履歴</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400">
            あなたのダウンロード履歴と利用統計
          </p>
        </div>

        {/* 統計サマリー */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">{stats.totalDownloads}</h3>
                <p className="text-gray-400 text-sm">総ダウンロード数</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">{stats.thisMonthDownloads}</h3>
                <p className="text-gray-400 text-sm">今月の利用数</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">{stats.favoriteCategory}</h3>
                <p className="text-gray-400 text-sm">好みのジャンル</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">{stats.averageVideoLength}秒</h3>
                <p className="text-gray-400 text-sm">平均動画時間</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10 col-span-2 lg:col-span-1">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-black text-white mb-1 line-clamp-1">{stats.mostDownloadedVideo}</h3>
                <p className="text-gray-400 text-sm">よく見る動画</p>
              </div>
            </div>
          </div>
        )}

        {/* フィルターとソート */}
        <div className="space-y-4 mb-6 sm:mb-8">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="履歴を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* フィルターとソート */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            >
              {dateFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* 結果数表示 */}
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{filteredDownloads.length}</span>件の履歴が見つかりました
          </div>
        </div>

        {/* ダウンロード履歴リスト */}
        {filteredDownloads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">履歴がありません</h3>
            <p className="text-gray-400 mb-4">
              条件に一致するダウンロード履歴が見つかりませんでした。
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setDateFilter('all');
              }}
              className="cyber-button text-white px-6 py-2 rounded-lg font-medium"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDownloads.map((download) => (
              <div key={download.id} className="glass-effect rounded-xl p-4 sm:p-6 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* サムネイル */}
                  <div className="flex-shrink-0">
                    <div className="relative w-full sm:w-32 h-20 bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={download.video?.thumbnail_url}
                        alt={download.video?.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setPreviewVideo(download.video);
                            setShowPreview(true);
                          }}
                          className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
                        {formatDuration(download.video?.duration || 0)}
                      </div>
                    </div>
                  </div>

                  {/* 動画情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <div className="mb-1" />
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                          {download.video?.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded text-xs">
                            {getCategoryName(download.video?.category || '')}
                          </span>
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                            {download.video?.resolution}
                          </span>
                        </div>
                        {download.video?.tags && download.video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {download.video.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="text-gray-500 text-xs">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-gray-400 text-sm mb-3">
                          {formatDate(download.downloaded_at)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => redownloadVideo(download)}
                            className="bg-cyan-400 hover:bg-cyan-500 text-black px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            再DL
                          </button>
                          <button
                            onClick={() => deleteDownloadRecord(download.id)}
                            className="bg-gray-600 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* プレビューモーダル */}
      {showPreview && previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative glass-dark rounded-2xl border border-white/20 p-6 max-w-2xl w-full">
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ×
            </button>
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
              <video 
                controls 
                className="w-full h-full"
                poster={previewVideo.thumbnail_url}
              >
                <source src={previewVideo.file_url} type="video/mp4" />
              </video>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{previewVideo.title}</h3>
            <p className="text-gray-400 text-sm">{previewVideo.description}</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DownloadHistory;
