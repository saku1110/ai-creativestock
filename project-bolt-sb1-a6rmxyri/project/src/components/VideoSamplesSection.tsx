import React, { useState } from 'react';
import { Play, Star, Clock, Pause } from 'lucide-react';

interface VideoSamplesProps {
  onAuthRequest: () => void;
  onContactRequest: () => void;
}

const VideoSamplesSection: React.FC<VideoSamplesProps> = ({ onAuthRequest, onContactRequest }) => {
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const sampleVideos = [
    {
      video: '/videos/sample1.mp4'
    },
    {
      video: '/videos/sample2.mp4'
    },
    {
      video: '/videos/sample3.mp4'
    },
    {
      video: '/videos/sample4.mp4'
    },
    {
      video: '/videos/sample5.mp4'
    },
    {
      video: '/videos/sample6.mp4'
    },
    {
      video: '/videos/sample7.mp4'
    },
    {
      video: '/videos/sample8.mp4'
    }
  ];

  const qualityFeatures = [
    '4K対応の鮮明な映像',
    'プロ仕様の音響効果',
    'スムーズなアニメーション',
    '商用利用可能な完全オリジナル素材'
  ];

  const handleVideoHover = (index: number, isHovering: boolean) => {
    if (isHovering) {
      setHoveredVideo(index);
      setPlayingVideo(index);
    } else {
      setHoveredVideo(null);
      setPlayingVideo(null);
    }
  };
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="gradient-text">高品質AI動画素材</span>サンプル事例
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            実写級の美しさで成約率を最大化する、業界最高品質の動画素材コレクション
          </p>
        </div>


        {/* 動画サンプルグリッド */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-16 sm:mb-20">
          {sampleVideos.map((videoData, index) => (
            <div key={index} className="group relative">
              <div 
                className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover-lift cursor-pointer"
                onMouseEnter={() => handleVideoHover(index, true)}
                onMouseLeave={() => handleVideoHover(index, false)}
              >
                {/* サムネイル動画（一時停止状態） */}
                <video
                  src={videoData.video}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    playingVideo === index ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
                  }`}
                  muted
                  playsInline
                  preload="metadata"
                />
                
                {/* 動画要素（再生中） */}
                <video
                  src={videoData.video}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    playingVideo === index ? 'opacity-100' : 'opacity-0'
                  }`}
                  autoPlay={playingVideo === index}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                
                {/* オーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                    <div className="flex items-center justify-between text-white text-xs">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>8秒</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-current text-yellow-400" />
                        <span>4.8</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* プレイボタン */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={onAuthRequest}
                    className={`glass-effect hover:bg-white/20 rounded-full p-3 sm:p-4 transition-all duration-300 transform hover:scale-110 shadow-2xl border border-cyan-400/30 ${
                      playingVideo === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {playingVideo === index ? (
                      <Pause className="w-4 sm:w-6 h-4 sm:h-6 text-cyan-400" />
                    ) : (
                      <Play className="w-4 sm:w-6 h-4 sm:h-6 text-cyan-400 ml-0.5" />
                    )}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* 品質保証 */}
        <div className="glass-effect rounded-3xl p-8 sm:p-12 border border-cyan-600/30 shadow-2xl bg-gray-800/50">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
            品質保証
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {qualityFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-400 font-medium">{feature}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8 sm:mt-12">
            <button 
              onClick={onAuthRequest}
              className="cyber-button text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 text-base sm:text-lg"
            >
              AI動画素材一覧を見る
            </button>
            <button 
              onClick={onContactRequest}
              className="ml-4 glass-effect border border-white/10 text-gray-400 hover:text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 hover:bg-gray-50 text-base sm:text-lg bg-gray-800/50"
            >
              お問い合わせ
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSamplesSection;
