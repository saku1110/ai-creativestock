import React, { useState } from 'react';
import { Play, Star, Clock, Pause } from 'lucide-react';

interface VideoSamplesProps {
  onAuthRequest: () => void;
  onContactRequest: () => void;
}

const VideoSamplesSection: React.FC<VideoSamplesProps> = ({ onAuthRequest, onContactRequest }) => {
  const [activeCategory, setActiveCategory] = useState('美容');
  const [hoveredVideo, setHoveredVideo] = useState<number | null>(null);
  const [playingVideo, setPlayingVideo] = useState<number | null>(null);

  const categories = [
    {
      name: '美容',
      count: 6,
      color: 'from-pink-500 to-rose-600'
    },
    {
      name: 'ダイエット・フィットネス',
      count: 6,
      color: 'from-green-500 to-emerald-600'
    },
    {
      name: 'ヘアケア',
      count: 6,
      color: 'from-purple-500 to-violet-600'
    },
    {
      name: 'ビジネス・副業',
      count: 6,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      name: 'ライフスタイル',
      count: 6,
      color: 'from-orange-500 to-amber-600'
    }
  ];

  const sampleVideos = [
    {
      thumbnail: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184434/pexels-photo-3184434.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
    },
    {
      thumbnail: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=400',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
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

        {/* カテゴリータブ */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
          {categories.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-300 ${
                activeCategory === category.name
                  ? 'cyber-button text-white shadow-2xl'
                  : 'glass-effect text-gray-400 hover:text-white border border-white/10 hover:border-cyan-400/50'
              }`}
            >
              {category.name}
            </button>
          ))}
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
                {/* サムネイル画像 */}
                <img 
                  src={videoData.thumbnail}
                  alt={`${activeCategory} 動画サンプル ${index + 1}`}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    playingVideo === index ? 'opacity-0' : 'opacity-100 group-hover:scale-105'
                  }`}
                />
                
                {/* 動画要素 */}
                <video
                  src={videoData.video}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                    playingVideo === index ? 'opacity-100' : 'opacity-0'
                  }`}
                  autoPlay={playingVideo === index}
                  muted
                  loop
                  playsInline
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

                {/* カテゴリーバッジ */}
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                  <span className="glass-effect text-cyan-400 px-2 py-1 rounded-full text-xs font-bold border border-cyan-400/30">
                    {activeCategory}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 品質保証 */}
        <div className="glass-effect rounded-3xl p-8 sm:p-12 border border-cyan-400/30 shadow-2xl">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
            品質保証
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {qualityFeatures.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-300 font-medium">{feature}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8 sm:mt-12">
            <button 
              onClick={onAuthRequest}
              className="cyber-button text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 text-base sm:text-lg"
            >
              全ての動画素材を見る
            </button>
            <button 
              onClick={onContactRequest}
              className="ml-4 glass-effect border border-white/20 text-gray-300 hover:text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 hover:bg-white/5 text-base sm:text-lg"
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