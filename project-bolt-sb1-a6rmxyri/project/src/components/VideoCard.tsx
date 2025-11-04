import React, { useState, useEffect, useRef } from 'react';
import { Play, Heart, Download, Clock, Star, Eye, Zap, Lock, AlertTriangle } from 'lucide-react';
import { VideoAsset } from '../types';
import VideoPreviewModal from './VideoPreviewModal';
import { useDownloadLimits } from '../lib/downloadLimits';
import { useUser } from '../hooks/useUser';
import { getNextDownloadFilename } from '../utils/downloadFilename';

interface VideoCardProps {  minimal?: boolean; // LP�O���b�h�p�̊ȈՕ\��\n}

const VideoCard: React.FC<VideoCardProps> = ({ video, isSubscribed = false, onAuthRequest, minimal = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isInlinePlaying, setIsInlinePlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const { user } = useUser();
  const { usage, executeDownload, checkDownload, warningMessage } = useDownloadLimits(user?.id || '');


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

  const handleDownload = async () => {
    if (!user) {
      onAuthRequest?.();
      return;
    }

    if (!isSubscribed) {
      alert('ダウンロードにはサブスクリプション登録が忁E��でぁE);
      return;
    }

    setIsDownloading(true);
    
    try {
      const result = await executeDownload(video.id);
      
      if (result.success && result.downloadUrl) {
        // ダウンロードURLを使用してファイルをダウンローチE        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = getNextDownloadFilename(result.downloadUrl);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 成功メチE��ージを表示
        alert('ダウンロードが開始されました');
      } else {
        alert(result.error || 'ダウンロードに失敗しました');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロード中にエラーが発生しました');
    } finally {
      setIsDownloading(false);
    }
  };

  const getDownloadButtonState = () => {
    if (!user) return { disabled: true, text: 'ログイン忁E��E, color: 'bg-gray-600' };
    if (!isSubscribed) return { disabled: true, text: '要サブスクリプション', color: 'bg-gray-600' };
    if (isDownloading) return { disabled: true, text: 'ダウンロード中...', color: 'bg-blue-600' };
    if (usage?.isLimitExceeded) return { disabled: true, text: '制限到遁E, color: 'bg-red-600' };
    
    return { disabled: false, text: 'ダウンローチE, color: 'bg-green-600 hover:bg-green-700' };
  };

  const downloadButtonState = getDownloadButtonState();

  const startInline = async () => {
    const el = videoRef.current;
    if (!el || !video.videoUrl) return;
    try {
      await el.play();
      setIsInlinePlaying(true);
    } catch {
      // ignore autoplay errors
    }
  };

  const stopInline = () => {
    const el = videoRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}
    setIsInlinePlaying(false);
  };

  const handleHoverEnter = () => {
    setIsHovered(true);
    startInline();
  };

  const handleHoverLeave = () => {
    setIsHovered(false);
    stopInline();
  };

  const handleTapToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isInlinePlaying) stopInline(); else void startInline();
  };

  return (
    <>
      <div 
        className="glass-dark rounded-2xl sm:rounded-3xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500 overflow-hidden border border-white/10 hover-lift group neon-border"
        onMouseEnter={handleHoverEnter}
        onMouseLeave={handleHoverLeave}
      >
        <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black overflow-hidden">
          <img 
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            data-video-id={video.id}
            onContextMenu={(e) => {
              e.preventDefault();
              return false;
            }}
            onDragStart={(e) => {
              e.preventDefault();
              return false;
            }}
            style={{
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          />

          {video.videoUrl && (
            <video
              ref={videoRef}
              src={video.videoUrl}
              muted
              playsInline
              preload="metadata"
              onClick={handleTapToggle}
              onTouchStart={handleTapToggle}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isInlinePlaying ? 'opacity-100' : 'opacity-0'}`}
              onContextMenu={(e) => { e.preventDefault(); return false; }}
            />
          )}

          {/* プレイボタンオーバ�Eレイ */}
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
          <p className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2 leading-relaxed">{video.description}</p>
          
          {/* メタ惁E�� */}
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
          
          {/* ダウンロード制限警呁E*/}
          {warningMessage && isSubscribed && (
            <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-400 text-xs">{warningMessage}</p>
              </div>
            </div>
          )}

          {/* ダウンロード使用状況表示 */}
          {usage && isSubscribed && (
            <div className="mb-3 p-2 bg-gray-800/50 border border-gray-600/30 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">月間ダウンローチE/span>
                <span className="text-xs text-white font-bold">
                  {usage.currentUsage}/{usage.monthlyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usage.currentUsage >= usage.monthlyLimit 
                      ? 'bg-red-500' 
                      : usage.currentUsage >= usage.monthlyLimit * 0.8 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usage.currentUsage / usage.monthlyLimit) * 100, 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">
                リセチE��: {usage.resetDate.toLocaleDateString()}
              </div>
            </div>
          )}

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
                <button 
                  onClick={handleDownload}
                  disabled={downloadButtonState.disabled}
                  className={`w-full ${downloadButtonState.color} ${
                    downloadButtonState.disabled ? 'cursor-not-allowed opacity-50' : 'hover:shadow-lg'
                  } text-white py-2 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm`}
                >
                  {isDownloading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 sm:w-5 h-4 sm:h-5" />
                  )}
                  <span className="whitespace-nowrap">{downloadButtonState.text}</span>
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


