import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Download, Heart, Share2, Eye, Info } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';

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

interface ImprovedVideoPreviewProps {
  video: VideoAsset;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (video: VideoAsset) => void;
}

const ImprovedVideoPreview: React.FC<ImprovedVideoPreviewProps> = ({ 
  video, 
  isOpen, 
  onClose,
  onDownload
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // 自動再生時はミュート必須
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { user, remainingDownloads, hasActiveSubscription } = useUser();
  const canDownload = Boolean(user && hasActiveSubscription);

  const categories = {
    'beauty': '美容',
    'fitness': 'フィットネス', 
    'haircare': 'ヘアケア',
    'business': 'ビジネス',
    'lifestyle': 'ライフスタイル'
  };

  // モーダルが開いたときの初期化
  useEffect(() => {
    if (isOpen && videoRef.current) {
      setCurrentTime(0);
      setIsPlaying(false);
      setIsLoading(true);
      setHasError(false);
      
      // お気に入り状態をチェック
      checkFavoriteStatus();
      
      // 自動再生（ミュート状態で）
      setTimeout(() => {
        if (videoRef.current && canDownload) {
          videoRef.current.play().catch(() => {
            setHasError(true);
          });
          setIsPlaying(true);
        }
      }, 500);
    }
  }, [isOpen, canDownload]);

  // お気に入り状態をチェック
  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await database
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', video.id)
        .single();
        
      setIsFavorited(!!data && !error);
    } catch (error) {
      console.error('お気に入り状態チェックエラー:', error);
    }
  };

  // 動画イベントリスナー
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime);
    const handleDurationChange = () => setDuration(videoElement.duration);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setHasError(true);
      setIsLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      videoElement.currentTime = 0;
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', handleDurationChange);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', handleDurationChange);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // スクロール無効化
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const togglePlay = () => {
    if (!videoRef.current || !canDownload) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => setHasError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !canDownload) return;
    
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('フルスクリーンエラー:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      alert('お気に入り機能を使用するにはログインが必要です。');
      return;
    }

    try {
      if (isFavorited) {
        // お気に入りから削除
        const { error } = await database
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', video.id);
          
        if (!error) {
          setIsFavorited(false);
        }
      } else {
        // お気に入りに追加
        const { error } = await database
          .from('user_favorites')
          .insert([{ user_id: user.id, video_id: video.id }]);
          
        if (!error) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error('お気に入りエラー:', error);
      alert('お気に入りの更新に失敗しました。');
    }
  };

  const formatTime = (time: number) => {
    const seconds = Math.floor(time);
    return `${seconds}秒`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: video.description,
          url: window.location.href
        });
      } catch (error) {
        console.log('シェアがキャンセルされました');
      }
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('URLがクリップボードにコピーされました！');
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black ${isFullscreen ? 'p-0' : 'p-4'}`}
    >
      {/* オーバーレイ */}
      {!isFullscreen && (
        <div 
          className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* モーダルコンテンツ */}
      <div className={`relative w-full max-w-6xl glass-dark border border-white/20 overflow-hidden shadow-2xl ${
        isFullscreen ? 'h-full rounded-none' : 'max-h-[95vh] rounded-3xl'
      }`}>
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-2 line-clamp-1">
              {video.title}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="bg-cyan-400/20 text-cyan-400 px-2 py-1 rounded text-xs">
                {categories[video.category] || video.category}
              </span>
              <span>{video.resolution}</span>
              <span>{formatTime(video.duration)}</span>
              <span>{video.download_count}回DL</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* 動画プレイヤー */}
          <div className="flex-1">
            <div className="relative aspect-[9/16] bg-black overflow-hidden">
              {/* 動画要素 */}
              <video
                ref={videoRef}
                src={video.file_url}
                poster={video.thumbnail_url}
                className="w-full h-full object-cover"
                muted={isMuted}
                playsInline
                loop
              />
              
              {/* ローディング */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              
              {/* エラー表示 */}
              {hasError && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <p className="text-lg mb-2">動画の読み込みに失敗しました</p>
                    <p className="text-gray-400 text-sm">しばらくしてから再度お試しください</p>
                  </div>
                </div>
              )}
              
              {/* 未登録ユーザー用のオーバーレイ */}
              {!canDownload && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">プレビュー制限</h3>
                    <p className="text-gray-300 mb-4 text-sm">フル動画を視聴するには<br />サブスクリプションが必要です</p>
                    <button 
                      onClick={onClose}
                      className="cyber-button text-white px-6 py-2 rounded-lg font-medium text-sm"
                    >
                      プランを見る
                    </button>
                  </div>
                </div>
              )}
              
              {/* 再生コントロール */}
              {canDownload && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* プログレスバー */}
                  <div className="mb-3">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  
                  {/* コントロールボタン */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={togglePlay}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-1" />
                        )}
                      </button>
                      <button
                        onClick={toggleMute}
                        className="p-2 text-white hover:text-cyan-400 transition-colors"
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <span className="text-white text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    
                    <button 
                      onClick={toggleFullscreen}
                      className="p-2 text-white hover:text-cyan-400 transition-colors"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* サイドパネル（詳細情報） */}
          {(showInfo || !isFullscreen) && (
            <div className="w-full lg:w-80 xl:w-96 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/20">
              <div className="space-y-6">
                {/* 動画情報 */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">動画詳細</h3>
                  <p className="text-gray-300 mb-4 text-sm leading-relaxed">{video.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">カテゴリー</span>
                      <span className="text-white">{categories[video.category]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">解像度</span>
                      <span className="text-white">{video.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">再生時間</span>
                      <span className="text-white">{formatTime(video.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ダウンロード数</span>
                      <span className="text-white">{video.download_count.toLocaleString()}回</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">アップロード日</span>
                      <span className="text-white">{formatDate(video.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* タグ */}
                {video.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2">タグ</h4>
                    <div className="flex flex-wrap gap-1">
                      {video.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="space-y-3">
                  {canDownload ? (
                    <>
                      <button
                        onClick={() => onDownload && onDownload(video)}
                        disabled={!canDownload || remainingDownloads <= 0}
                        className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold transition-all ${
                          remainingDownloads > 0
                            ? 'bg-cyan-400 hover:bg-cyan-500 text-black'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        <span>ダウンロード ({remainingDownloads}回残り)</span>
                      </button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={toggleFavorite}
                          className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg transition-all font-medium text-sm ${
                            isFavorited 
                              ? 'bg-pink-400/20 text-pink-400 border border-pink-400/30' 
                              : 'bg-gray-700/50 text-gray-300 hover:text-white border border-white/20'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                          <span>お気に入り</span>
                        </button>
                        <button 
                          onClick={handleShare}
                          className="flex items-center justify-center space-x-2 bg-gray-700/50 text-gray-300 hover:text-white py-2 px-3 rounded-lg transition-all font-medium text-sm border border-white/20"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>シェア</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <button 
                      onClick={onClose}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>サブスクリプションに加入</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImprovedVideoPreview;