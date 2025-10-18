import React, { useState, useEffect } from 'react';
import { Heart, Search, Filter, Download, Play, Eye, Grid, List, Star, Clock, TrendingUp } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';
import Sidebar from './Sidebar';
import { getNextDownloadFilename } from '../utils/downloadFilename';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'fitness' | 'haircare' | 'business' | 'lifestyle';
  tags: string[];
  duration: number;
  resolution: string;
  file_url: string;
  thumbnail_url: string;
  is_featured: boolean;
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

const UserFavorites: React.FC<UserFavoritesProps> = ({ onPageChange = () => {} }) => {
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [stats, setStats] = useState<FavoriteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPreview, setShowPreview] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoAsset | null>(null);
  const { user, subscription, remainingDownloads } = useUser();

  const categories = [
    { id: 'all', name: '全て' },
    { id: 'beauty', name: '美容' },
    { id: 'fitness', name: 'フィットネス' },
    { id: 'haircare', name: 'ヘアケア' },
    { id: 'business', name: 'ビジネス' },
    { id: 'lifestyle', name: 'ライフスタイル' }
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
      fetchFavorites();
      fetchFavoriteStats();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const { data, error } = await database
        .from('user_favorites')
        .select(`
          *,
          video:video_assets(*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Favorites fetch error:', error);
        return;
      }

      setFavorites(data || []);
    } catch (error) {
      console.error('Favorites error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteStats = async () => {
    try {
      const { data, error } = await database
        .from('user_favorites')
        .select(`
          created_at,
          video:video_assets(category, duration, title)
        `)
        .eq('user_id', user!.id);

      if (error || !data) return;

      // カテゴリ別集計
      const categoryCount: Record<string, number> = {};
      data.forEach(f => {
        const category = f.video?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const favoriteCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category: getCategoryName(category), count }))
        .sort((a, b) => b.count - a.count);

      // 平均動画時間
      const totalDuration = data.reduce((sum, f) => sum + (f.video?.duration || 0), 0);
      const averageDuration = data.length > 0 ? Math.round(totalDuration / data.length) : 0;

      // 最新のお気に入り
      const mostRecentFavorite = data.length > 0 ? data[0].video?.title || 'なし' : 'なし';

      setStats({
        totalFavorites: data.length,
        favoriteCategories,
        averageDuration,
        mostRecentFavorite
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

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await database
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId)
        .eq('user_id', user!.id);

      if (error) {
        console.error('Remove favorite error:', error);
        alert('お気に入りの削除に失敗しました。');
        return;
      }

      // 再フェッチ
      fetchFavorites();
      fetchFavoriteStats();
    } catch (error) {
      console.error('Remove favorite error:', error);
      alert('お気に入りの削除に失敗しました。');
    }
  };

  const downloadVideo = async (video: VideoAsset) => {
    if (!subscription || remainingDownloads <= 0) {
      alert('ダウンロード制限に達しています。プランをアップグレードしてください。');
      return;
    }

    try {
      // ダウンロード処理
      const link = document.createElement('a');
      link.href = video.file_url;
      link.download = getNextDownloadFilename(video.file_url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // ダウンロード履歴を記録
      await database
        .from('download_history')
        .insert([{
          user_id: user!.id,
          video_id: video.id,
          ip_address: null,
          user_agent: navigator.userAgent
        }]);

      // ダウンロード数を更新
      await database
        .from('video_assets')
        .update({ download_count: video.download_count + 1 })
        .eq('id', video.id);

    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました。');
    }
  };

  // フィルターとソート
  const filteredFavorites = favorites
    .filter(favorite => {
      // 検索フィルター
      const searchMatch = !searchQuery || 
        favorite.video?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        favorite.video?.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // カテゴリフィルター
      const categoryMatch = categoryFilter === 'all' || favorite.video?.category === categoryFilter;
      
      return searchMatch && categoryMatch;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">お気に入りを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#ffffff' }}>
      {/* サイドバー */}
      <Sidebar currentPage="favorites" onPageChange={onPageChange} />
      
      {/* メインコンテンツ */}
      <div style={{ marginLeft: '260px', padding: '20px 30px' }}>
        <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4">
            <span className="gradient-text">お気に入り</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400">
            あなたがお気に入りに追加した動画コレクション
          </p>
        </div>

        {/* 統計サマリー */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">{stats.totalFavorites}</h3>
                <p className="text-gray-400 text-sm">お気に入り総数</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">
                  {stats.favoriteCategories[0]?.category || 'なし'}
                </h3>
                <p className="text-gray-400 text-sm">好みのジャンル</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-white mb-1">{stats.averageDuration}秒</h3>
                <p className="text-gray-400 text-sm">平均動画時間</p>
              </div>
            </div>

            <div className="glass-effect rounded-xl p-4 border border-white/10">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-sm font-black text-white mb-1 line-clamp-1">{stats.mostRecentFavorite}</h3>
                <p className="text-gray-400 text-sm">最新のお気に入り</p>
              </div>
            </div>
          </div>
        )}

        {/* フィルターとコントロール */}
        <div className="space-y-4 mb-6 sm:mb-8">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="お気に入りを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* フィルターとソート */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
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

            {/* 表示モード切り替え */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 結果数表示 */}
          <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{filteredFavorites.length}</span>件のお気に入りが見つかりました
          </div>
        </div>

        {/* お気に入りリスト */}
        {filteredFavorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">お気に入りがありません</h3>
            <p className="text-gray-400 mb-4">
              条件に一致するお気に入り動画が見つかりませんでした。
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
              className="cyber-button text-white px-6 py-2 rounded-lg font-medium"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6' : 'space-y-4'}>
            {filteredFavorites.map((favorite) => (
              <div key={favorite.id} className={`glass-effect rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all duration-300 group ${viewMode === 'list' ? 'flex gap-4 p-4' : ''}`}>
                {/* サムネイル */}
                <div className={`relative ${viewMode === 'list' ? 'w-32 h-20 flex-shrink-0' : 'aspect-video'} bg-gray-800 overflow-hidden`}>
                  <img
                    src={favorite.video?.thumbnail_url}
                    alt={favorite.video?.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setPreviewVideo(favorite.video);
                        setShowPreview(true);
                      }}
                      className="bg-white/20 backdrop-blur-sm rounded-full p-2 hover:bg-white/30 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => downloadVideo(favorite.video)}
                      className="bg-cyan-400/20 backdrop-blur-sm rounded-full p-2 hover:bg-cyan-400/30 transition-colors"
                    >
                      <Download className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1 rounded">
                    {formatDuration(favorite.video?.duration || 0)}
                  </div>
                </div>

                {/* 動画情報 */}
                <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'p-4'}`}>
                  <div className="flex items-start justify-end mb-2">
                    <button
                      onClick={() => removeFavorite(favorite.id)}
                      className="text-pink-400 hover:text-pink-300 transition-colors ml-2"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  
                  <p className={`text-gray-400 text-xs ${viewMode === 'list' ? 'line-clamp-2' : 'line-clamp-3'} mb-3`}>
                    {favorite.video?.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded text-xs">
                      {getCategoryName(favorite.video?.category || '')}
                    </span>
                    <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                      {favorite.video?.resolution}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {formatDate(favorite.created_at)}にお気に入り追加
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

export default UserFavorites;
