import React, { useState } from 'react';
import { Play, Heart, Download, Clock, Star, ShoppingCart, Eye, Zap, Lock } from 'lucide-react';
import { VideoAsset } from '../types';
import VideoPreviewModal from './VideoPreviewModal';

interface VideoCardProps {
  video: VideoAsset;
  isSubscribed?: boolean; // 料金プランに加入しているかどうか
  onAuthRequest?: () => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, isSubscribed = false, onAuthRequest }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    return `${seconds}秒`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div 
        className="glass-dark rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 overflow-hidden border border-white/10 hover-lift group neon-border"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          <img 
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* ロゴマスク（未加入ユーザー用） */}
          {!isSubscribed && (
            <>
              {/* 中央の大きなロゴ */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 border border-cyan-400/30 shadow-2xl">
                  <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                    <div className="w-12 sm:w-16 lg:w-20 h-12 sm:h-16 lg:h-20 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center animate-glow">
                      <Zap className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-black gradient-text">
                        AI Creative Stock
                      </h3>
                     <p className="text-xs sm:text-sm text-gray-300 opacity-80">Creative Video Assets</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 四隅の小さなロゴ */}
              <div className="absolute top-4 left-4 opacity-30">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
              </div>
              <div className="absolute top-4 right-4 opacity-30">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
              </div>
              <div className="absolute bottom-4 left-4 opacity-30">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 opacity-30">
                <div className="w-6 sm:w-8 h-6 sm:h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
              </div>
              
              {/* 繰り返しパターンの透かし */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-3 h-full">
                  {Array.from({ length: 9 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-center">
                      <div className="w-8 sm:w-12 h-8 sm:h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center transform rotate-12">
                        <Zap className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-transparent to-purple-600/20"></div>
            </>
          )}
          
          {/* プレイボタンオーバーレイ */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-center justify-center transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}>
            <button 
              onClick={handlePreviewClick}
              className={`glass-effect hover:bg-white/20 rounded-full p-4 sm:p-6 transition-all duration-300 transform hover:scale-110 shadow-2xl border border-cyan-400/30 animate-glow ${
                !isSubscribed ? 'opacity-50' : ''
              }`}
            >
              <Play className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-cyan-400 ml-1" />
            </button>
          </div>
          
          {/* バッジ - NEWのみ */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex flex-col space-y-2 z-10">
            {video.isNew && (
              <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold animate-pulse">
                NEW
              </div>
            )}
          </div>
          
          {/* アクションボタン */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex flex-col space-y-2 z-10">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 sm:p-3 rounded-full transition-all duration-300 ${
                isLiked 
                  ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg animate-pulse' 
                  : 'glass-effect text-gray-300 hover:text-white border border-white/20'
              }`}
            >
              <Heart className={`w-4 sm:w-5 h-4 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={handlePreviewClick}
              className="p-2 sm:p-3 rounded-full glass-effect text-gray-300 hover:text-cyan-400 transition-all duration-300 border border-white/20"
            >
              <Eye className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>
          
          {/* 価格 */}
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 bg-gradient-to-r from-cyan-400 to-purple-600 text-white px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-full font-black shadow-2xl text-xs sm:text-sm lg:text-base z-10">
            {!isSubscribed ? 'プレミアム' : formatPrice(video.price)}
          </div>
        </div>
        
        <div className="p-3 sm:p-4 lg:p-6">
          {/* タイトルとカテゴリー */}
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white line-clamp-2 flex-1 pr-2">{video.title}</h3>
          </div>
          
          <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">{video.description}</p>
          
          {/* メタ情報 */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <span className="glass-effect text-cyan-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border border-cyan-400/30">
              {video.category}
            </span>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-gray-400 text-xs font-bold bg-gray-800/50 px-2 py-1 rounded-full">{video.resolution}</span>
              <div className="glass-dark text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1 border border-white/20">
                <Clock className="w-3 sm:w-4 h-3 sm:h-4" />
                <span>{formatDuration(video.duration)}</span>
              </div>
            </div>
          </div>
          
          {/* 統計情報 */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 fill-current text-yellow-400" />
              <span className="font-bold text-white">{video.rating.toFixed(1)}</span>
            </div>
          </div>
          
          {/* アクションボタン */}
          <div className="flex flex-col space-y-2 sm:space-y-3">
            {!isSubscribed ? (
              <>
                <button 
                  onClick={onAuthRequest}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-orange-500/25 text-xs sm:text-sm"
                >
                  <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="whitespace-nowrap">プランに加入</span>
                </button>
                <button 
                  onClick={handlePreviewClick}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 glass-effect border border-orange-400/30 text-orange-400 hover:text-white rounded-lg sm:rounded-xl transition-all duration-300 font-bold hover:bg-orange-400/10 text-xs sm:text-sm"
                >
                  プレビュー
                </button>
              </>
            ) : (
              <>
                <button className="w-full cyber-button text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-cyan-500/25 text-xs sm:text-sm">
                  <ShoppingCart className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="whitespace-nowrap">カートに追加</span>
                </button>
                <button 
                  onClick={handlePreviewClick}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 glass-effect border border-cyan-400/30 text-cyan-400 hover:text-white rounded-lg sm:rounded-xl transition-all duration-300 font-bold hover:bg-cyan-400/10 text-xs sm:text-sm"
                >
                  プレビュー
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* プレビューモーダル */}
      <VideoPreviewModal
        video={video}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isSubscribed={isSubscribed}
      />
    </>
  );
};

export default VideoCard;