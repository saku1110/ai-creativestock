import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Download, Heart, Share2, Eye, Info } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'diet' | 'business' | 'lifestyle' | 'romance' | 'pet';
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
  const [showPlayButton, setShowPlayButton] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playButtonTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user, remainingDownloads, hasActiveSubscription } = useUser();
  const canDownload = Boolean(user && hasActiveSubscription);

  const categories: Record<VideoAsset['category'], string> = {
    beauty: '美容',
    diet: 'ダイエット',
    business: 'ビジネス',
    lifestyle: 'ライフスタイル',
    romance: '恋愛',
    pet: 'ペット'
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
        if (videoRef.current) {
          videoRef.current.play().catch(() => {
            setHasError(true);
          });
          setIsPlaying(true);
        }
      }, 500);
    }
  }, [isOpen]);

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
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setShowPlayButton(true);
      if (playButtonTimeoutRef.current) {
        clearTimeout(playButtonTimeoutRef.current);
      }
    } else {
      videoRef.current.play().catch(() => setHasError(true));
      setShowPlayButton(false);
      // 再生中は3秒後にボタンを非表示
      playButtonTimeoutRef.current = setTimeout(() => {
        setShowPlayButton(false);
      }, 3000);
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    if (isPlaying) {
      // 再生中にクリックしたらボタンを表示
      setShowPlayButton(true);
      if (playButtonTimeoutRef.current) {
        clearTimeout(playButtonTimeoutRef.current);
      }
      playButtonTimeoutRef.current = setTimeout(() => {
        setShowPlayButton(false);
      }, 3000);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;

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
          className="absolute inset-0 bg-black/10"
          onClick={onClose}
        />
      )}

      {/* モーダルコンテンツ */}
      <div className={`relative w-full max-w-xl glass-dark border border-white/20 shadow-2xl flex flex-col overflow-hidden ${
        isFullscreen ? 'h-full rounded-none' : 'max-h-[90vh] rounded-3xl'
      }`}>

        {/* 閉じるボタン（動画上に配置） */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-gray-400 hover:text-white transition-all rounded-full backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 動画プレイヤー */}
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <div className="relative max-h-full flex items-center justify-center">
              <div
                className="relative cursor-pointer"
                onClick={handleVideoClick}
              >
              {/* 動画要素 */}
              <video
                ref={videoRef}
                src={video.file_url}
                poster={video.thumbnail_url}
                className="max-h-[calc(90vh-80px)] w-auto object-contain"
                muted={isMuted}
                playsInline
                loop
              />

              {/* 中央再生ボタン */}
              {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                    }}
                    className="pointer-events-auto w-20 h-20 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm border-2 border-white/30"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white ml-1" />
                    )}
                  </button>
                </div>
              )}
              
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

              {/* 再生コントロール */}
              {(
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
          </div>

          {/* アクションボタン */}
          <div className="border-t border-white/10 bg-black/20 p-3 flex-shrink-0">
            {canDownload ? (
              <div className="flex gap-3 max-w-md mx-auto">
                <button
                  onClick={() => onDownload && onDownload(video)}
                  disabled={!canDownload || remainingDownloads <= 0}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    remainingDownloads > 0
                      ? 'bg-cyan-400 hover:bg-cyan-500 text-black'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-5 h-5" />
                  <span>ダウンロード</span>
                </button>

                <button
                  onClick={toggleFavorite}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-bold ${
                    isFavorited
                      ? 'bg-pink-400/20 text-pink-400 border-2 border-pink-400'
                      : 'bg-gray-700/50 text-gray-300 hover:text-white border-2 border-white/20 hover:border-white/40'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                  <span>{isFavorited ? 'お気に入り解除' : 'お気に入り'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="w-full max-w-md mx-auto bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>サブスクリプションに加入</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImprovedVideoPreview;
