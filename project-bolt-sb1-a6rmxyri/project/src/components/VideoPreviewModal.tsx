import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Download, Heart, Share2 } from 'lucide-react';
import { VideoAsset } from '../types';

interface VideoPreviewModalProps {
  video: VideoAsset;
  isOpen: boolean;
  onClose: () => void;
  isSubscribed?: boolean;
  onAuthRequest?: () => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ 
  video, 
  isOpen, 
  onClose, 
  isSubscribed = false,
  onAuthRequest
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // サンプル動画URL（実際のプロジェクトでは適切な動画URLを使用）
  const sampleVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const seconds = Math.floor(time);
    return `${seconds}秒`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        onAuthRequest={onAuthRequest}
      />
      
      {/* モーダルコンテンツ */}
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-dark rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{video.title}</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="glass-effect px-3 py-1 rounded-full border border-cyan-400/30 text-cyan-400">
                {video.category}
              </span>
              <span>{video.resolution}</span>
              <span>{formatTime(video.duration)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 動画プレイヤー */}
        <div className="relative aspect-[9/16] max-h-[60vh] bg-black mx-6 mt-6 rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            src={sampleVideoUrl}
            className="w-full h-full object-cover"
            muted={isMuted}
            playsInline
          />
          
          {/* 未加入ユーザー用のオーバーレイ */}
          {!isSubscribed && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">プレビュー制限</h3>
                <p className="text-gray-300 mb-6">フル動画を視聴するには<br />料金プランへの加入が必要です</p>
                <button 
                  onClick={onAuthRequest}
                  className="cyber-button text-white px-8 py-3 rounded-xl font-bold"
                >
                  プランを見る
                </button>
              </div>
            </div>
          )}
          
          {/* 再生コントロール */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {/* プログレスバー */}
            <div className="mb-4">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                disabled={!isSubscribed}
              />
            </div>
            
            {/* コントロールボタン */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                  disabled={!isSubscribed}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-1" />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className="p-2 text-white hover:text-cyan-400 transition-colors"
                  disabled={!isSubscribed}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-white hover:text-cyan-400 transition-colors">
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 動画情報とアクション */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 動画詳細 */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">動画詳細</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">{video.description}</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">カテゴリー</span>
                  <span className="text-white font-medium">{video.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">解像度</span>
                  <span className="text-white font-medium">{video.resolution}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">再生時間</span>
                  <span className="text-white font-medium">{formatTime(video.duration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">ダウンロード数</span>
                  <span className="text-white font-medium">{video.downloads.toLocaleString()}回</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">評価</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★</span>
                    <span className="text-white font-medium">{video.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* アクションエリア */}
            <div>
              <h3 className="text-lg font-bold text-white mb-3">アクション</h3>
              
              {/* 価格表示 */}
              <div className="glass-effect rounded-2xl p-4 mb-6 border border-cyan-400/30">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-2">
                    {formatPrice(video.price)}
                  </div>
                  <p className="text-gray-400 text-sm">標準ライセンス</p>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                {!isSubscribed ? (
                  <>
                    <button 
                      onClick={onAuthRequest}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-orange-500/25"
                    >
                      <Download className="w-5 h-5" />
                      <span>プランに加入してダウンロード</span>
                    </button>
                    <button 
                      onClick={onAuthRequest}
                      className="w-full glass-effect border border-orange-400/30 text-orange-400 hover:text-white py-4 px-6 rounded-xl transition-all duration-300 font-bold hover:bg-orange-400/10"
                    >
                      料金プランを見る
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full cyber-button text-white py-4 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-cyan-500/25">
                      <Download className="w-5 h-5" />
                      <span>ダウンロード</span>
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setIsLiked(!isLiked)}
                        className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all font-medium ${
                          isLiked 
                            ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white' 
                            : 'glass-effect border border-white/20 text-gray-300 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        <span>お気に入り</span>
                      </button>
                      <button className="flex items-center justify-center space-x-2 glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-4 rounded-xl transition-all font-medium">
                        <Share2 className="w-4 h-4" />
                        <span>シェア</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewModal;