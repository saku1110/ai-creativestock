import React, { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Volume2, VolumeX, Download, Heart, Share2 } from "lucide-react";
import { VideoAsset } from "../types";

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

  const sampleVideoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  const videoSource = video.videoUrl || sampleVideoUrl;

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const updateTime = () => setCurrentTime(el.currentTime);
    const updateDuration = () => setDuration(el.duration);
    const handleEnded = () => setIsPlaying(false);

    el.addEventListener("timeupdate", updateTime);
    el.addEventListener("loadedmetadata", updateDuration);
    el.addEventListener("ended", handleEnded);

    return () => {
      el.removeEventListener("timeupdate", updateTime);
      el.removeEventListener("loadedmetadata", updateDuration);
      el.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = videoRef.current;
    if (!el) return;
    const time = parseFloat(e.target.value);
    el.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => `${Math.floor(time)}秒`;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0
    }).format(price);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[76vh] glass-dark rounded-2xl border border-white/20 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white">{video.title}</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="glass-effect px-2.5 py-0.5 rounded-full border border-cyan-400/30 text-cyan-200">
                {video.category}
              </span>
              <span>{video.resolution}</span>
              <span>{formatTime(video.duration)}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 flex flex-col gap-4 md:flex-row">
          <div className="flex-1 md:w-1/2 flex flex-col min-h-[0]">
            <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden flex-1 min-h-[220px]">
              <video
                ref={videoRef}
                src={videoSource}
                className="w-full h-full object-contain"
                muted={isMuted}
                playsInline
                onContextMenu={(e) => { e.preventDefault(); return false; }}
                controlsList="nodownload nofullscreen noremoteplayback"
                disablePictureInPicture
              />

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent px-3 py-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider mb-2"
                  disabled={!isSubscribed}
                />

                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-full"
                      disabled={!isSubscribed}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:text-cyan-400"
                      disabled={!isSubscribed}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 md:w-1/2 flex flex-col justify-between gap-3 text-sm">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">動画詳細</h3>
              <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">{video.description}</p>
              <div className="space-y-1 text-gray-300">
                <div className="flex items-center justify-between">
                  <span>カテゴリ</span>
                  <span className="text-white font-medium">{video.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>解像度</span>
                  <span className="text-white font-medium">{video.resolution}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>再生時間</span>
                  <span className="text-white font-medium">{formatTime(video.duration)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ダウンロード数</span>
                  <span className="text-white font-medium">{video.downloads.toLocaleString()}件</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="glass-effect rounded-xl p-3 border border-cyan-400/30 text-center">
                <div className="text-2xl font-black text-white">{formatPrice(video.price)}</div>
                <p className="text-gray-400 text-xs">標準ライセンス</p>
              </div>

              {!isSubscribed ? (
                <>
                  <button
                    onClick={onAuthRequest}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>プランに加入してダウンロード</span>
                  </button>
                  <button
                    onClick={onAuthRequest}
                    className="w-full glass-effect border border-orange-400/30 text-orange-400 hover:text-white py-3 rounded-xl font-semibold text-sm"
                  >
                    有料プランを見る
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full cyber-button text白 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-sm">
                    <Download className="w-4 h-4" />
                    <span>ダウンロード</span>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsLiked(!isLiked)}
                      className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm ${
                        isLiked ? "bg-gradient-to-r from-pink-500 to-red-500 text-white" : "glass-effect border border-white/20 text-gray-300 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                      <span>お気に入り</span>
                    </button>
                    <button className="flex items-center justify-center gap-1 py-2.5 rounded-xl glass-effect border border-white/20 text-gray-300 hover:text-white text-sm">
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
  );
};

export default VideoPreviewModal;
