import React, { useState } from 'react';
import { localLpGridVideos } from '../local-content';

interface VideoGalleryProps {
  onTrialRequest: () => void;
}

type GalleryVideo = {
  id: string;
  title: string;
  src: string;
};

const FALLBACK_GALLERY_VIDEOS: GalleryVideo[] = [
  { id: 'sample-1', title: '美容液紹介', src: '/videos/sample1.mp4' },
  { id: 'sample-2', title: '洗顔フォーム', src: '/videos/sample2.mp4' },
  { id: 'sample-3', title: 'トレーニング', src: '/videos/sample3.mp4' },
  { id: 'sample-4', title: 'ダイエット', src: '/videos/sample4.mp4' },
  { id: 'sample-5', title: '企業紹介', src: '/videos/sample5.mp4' },
  { id: 'sample-6', title: 'ヘアケア', src: '/videos/sample1.mp4' },
  { id: 'sample-7', title: 'メイクアップ', src: '/videos/sample2.mp4' },
  { id: 'sample-8', title: 'ファッション', src: '/videos/sample3.mp4' },
  { id: 'sample-9', title: 'サプリメント', src: '/videos/sample4.mp4' },
  { id: 'sample-10', title: '不動産', src: '/videos/sample5.mp4' },
  { id: 'sample-11', title: '教育', src: '/videos/sample1.mp4' },
  { id: 'sample-12', title: 'グルメ', src: '/videos/sample2.mp4' },
  { id: 'sample-13', title: '旅行', src: '/videos/sample3.mp4' },
  { id: 'sample-14', title: '金融', src: '/videos/sample4.mp4' },
  { id: 'sample-15', title: 'ペット', src: '/videos/sample5.mp4' },
  { id: 'sample-16', title: 'アプリ', src: '/videos/sample1.mp4' }
];

const LOCAL_GALLERY_VIDEOS: GalleryVideo[] = localLpGridVideos.map(video => ({
  id: video.id,
  title: video.title,
  src: video.url
}));

const GALLERY_VIDEOS: GalleryVideo[] = LOCAL_GALLERY_VIDEOS.length > 0
  ? LOCAL_GALLERY_VIDEOS.slice(0, 16)
  : FALLBACK_GALLERY_VIDEOS;

const VideoGallery: React.FC<VideoGalleryProps> = ({ onTrialRequest }) => {
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 動画ギャラリーグリッド（PC: 4×4、レスポンシブ: 2×8） */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
          {GALLERY_VIDEOS.map((video) => (
            <div
              key={video.id}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredVideo(video.id)}
              onMouseLeave={() => setHoveredVideo(null)}
            >
              <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 hover:border-cyan-400 transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 hover:scale-105">

                {/* ビデオサムネイル */}
                <video
                  src={video.src}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  loop
                  autoPlay={hoveredVideo === video.id}
                />

                {/* オーバーレイ */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-3 left-3 right-3">
                    <h4 className="text-white font-semibold text-xs sm:text-sm mb-1">
                      {video.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-300">
                      <span>9:16</span>
                      <span>AI生成</span>
                    </div>
                  </div>
                </div>

                {/* プレイボタン */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                  >
                    <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-1"></div>
                    </div>
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button 
            onClick={onTrialRequest}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-cyan-500/25"
          >
            1000+の動画素材を見る
          </button>
          <p className="text-gray-400 text-sm mt-4">
            AI動画素材一覧を見る
          </p>
        </div>
      </div>
    </section>
  );
};

export default VideoGallery;
