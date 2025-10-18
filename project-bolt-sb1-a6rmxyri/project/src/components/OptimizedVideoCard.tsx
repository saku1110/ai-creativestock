import React, { memo, useCallback } from 'react';
import { Download, Eye, Heart, Crown } from 'lucide-react';
import LazyImage from './LazyImage';
import { useUser } from '../hooks/useUser';

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

interface OptimizedVideoCardProps {
  video: VideoAsset;
  viewMode: 'grid' | 'list';
  isFavorited: boolean;
  canDownload: boolean;
  onDownload: (video: VideoAsset) => void;
  onPreview: (video: VideoAsset) => void;
  onToggleFavorite: (videoId: string) => void;
  onUpgradeRequest?: () => void;
}

const OptimizedVideoCard: React.FC<OptimizedVideoCardProps> = memo(({
  video,
  viewMode,
  isFavorited,
  canDownload,
  onDownload,
  onPreview,
  onToggleFavorite,
  onUpgradeRequest
}) => {
  const { isTrialUser, trialDownloadsRemaining } = useUser();
  const categories = {
    'beauty': '美容',
    'fitness': 'フィットネス', 
    'haircare': 'ヘアケア',
    'business': 'ビジネス',
    'lifestyle': 'ライフスタイル'
  };

  const formatDuration = useCallback((seconds: number) => {
    return `${seconds}秒`;
  }, []);

  const handleDownload = useCallback(() => {
    onDownload(video);
  }, [onDownload, video]);

  const handlePreview = useCallback(() => {
    onPreview(video);
  }, [onPreview, video]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(video.id);
  }, [onToggleFavorite, video.id]);

  const getCategoryColor = useCallback((category: string) => {
    switch (category) {
      case 'beauty': return 'bg-pink-500/20 text-pink-400';
      case 'fitness': return 'bg-green-500/20 text-green-400';
      case 'haircare': return 'bg-purple-500/20 text-purple-400';
      case 'business': return 'bg-blue-500/20 text-blue-400';
      case 'lifestyle': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }, []);

  return (
    <div
      className={`relative glass-dark rounded-xl sm:rounded-2xl border border-white/10 hover:border-cyan-400/50 transition-all duration-300 hover-lift ${
        viewMode === 'list' ? 'flex items-center space-x-4 sm:space-x-6 p-3 sm:p-6' : 'p-2 sm:p-4'
      }`}
    >
      {/* サムネイル */}
      <div className={`relative ${viewMode === 'list' ? 'w-24 h-16 sm:w-32 sm:h-20' : 'aspect-[9/16] mb-2 sm:mb-4'} rounded-lg sm:rounded-xl overflow-hidden bg-gray-800`}>
        <LazyImage
          src={video.thumbnail_url}
          alt={video.title}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <Eye className="w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-white" />
        </div>
        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
          {formatDuration(video.duration)}
        </div>
      </div>

      {/* 動画情報 */}
      <div className="flex-1">
        <div className={`flex flex-wrap gap-1 ${viewMode === 'grid' ? 'mb-1 sm:mb-3' : 'mb-2'}`}>
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-medium ${getCategoryColor(video.category)}`}>
            {categories[video.category] || video.category}
          </span>
        </div>

        <div className={`${viewMode === 'grid' ? 'mb-2' : 'mb-1'}`} aria-hidden="true" />

        {viewMode === 'list' && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
            {video.description}
          </p>
        )}

        {/* 統計情報 */}
        <div className={`flex items-center space-x-3 text-xs text-gray-400 ${viewMode === 'grid' ? 'mb-3' : 'mb-4'}`}>
          <span>{video.resolution}</span>
          {video.is_featured && <span className="text-yellow-400">★注目</span>}
        </div>

        {/* アクション */}
        <div className={`flex ${viewMode === 'grid' ? 'gap-1 sm:gap-2' : 'gap-2'}`}>
          {/* ダウンロード/アップグレードボタン */}
          {isTrialUser && trialDownloadsRemaining === 0 && onUpgradeRequest ? (
            <button
              onClick={onUpgradeRequest}
              className={`flex-1 flex items-center justify-center ${viewMode === 'grid' ? 'space-x-1 py-2 px-2 text-xs sm:text-sm' : 'space-x-2 py-3 px-4 text-sm'} rounded-lg sm:rounded-xl font-bold transition-all bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-green-500/25`}
            >
              <Crown className={`${viewMode === 'grid' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'}`} />
              <span className={viewMode === 'grid' ? 'hidden xs:inline sm:inline' : ''}>アップグレード</span>
            </button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={!canDownload}
              className={`flex-1 flex items-center justify-center ${viewMode === 'grid' ? 'space-x-1 py-2 px-2 text-xs sm:text-sm' : 'space-x-2 py-3 px-4 text-sm'} rounded-lg sm:rounded-xl font-bold transition-all ${
                canDownload
                  ? 'bg-cyan-400 hover:bg-cyan-500 text-black'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download className={`${viewMode === 'grid' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'}`} />
              <span className={viewMode === 'grid' ? 'hidden xs:inline sm:inline' : ''}>ダウンロード</span>
            </button>
          )}
          
          {/* 利用制限の警告 */}
          {isTrialUser && trialDownloadsRemaining === 1 && (
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
              残り1本
            </div>
          )}
          
          <button 
            onClick={handleToggleFavorite}
            className={`${viewMode === 'grid' ? 'p-1.5 sm:p-3' : 'p-3'} transition-colors rounded-lg sm:rounded-xl ${
              isFavorited
                ? 'bg-pink-400/20 hover:bg-pink-400/30 text-pink-400'
                : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
            }`}
          >
            <Heart className={`${viewMode === 'grid' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} ${
              isFavorited ? 'fill-current' : ''
            }`} />
          </button>
          
          <button 
            onClick={handlePreview}
            className={`${viewMode === 'grid' ? 'p-1.5 sm:p-3' : 'p-3'} bg-gray-700/50 hover:bg-gray-600/50 rounded-lg sm:rounded-xl transition-colors`}
          >
            <Eye className={`${viewMode === 'grid' ? 'w-3 h-3 sm:w-4 sm:h-4' : 'w-4 h-4'} text-gray-300`} />
          </button>
        </div>
      </div>
    </div>
  );
});

OptimizedVideoCard.displayName = 'OptimizedVideoCard';

export default OptimizedVideoCard;
