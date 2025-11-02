import React, { useRef, useState } from 'react';
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
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  const play = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    try { el.play(); } catch {}
  };

  const stop = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    try { el.pause(); el.currentTime = 0; } catch {}
  };

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 動画ギャラリーグリッド（PC: 4×4、レスポンシブ: 2×8） */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12">
          {GALLERY_VIDEOS.map((video) => (
            <div
              key={video.id}
              className="cursor-pointer"
              onMouseEnter={() => { setHoveredVideo(video.id); play(video.id); }}
              onMouseLeave={() => { setHoveredVideo(null); stop(video.id); }}
              onTouchStart={() => { if (hoveredVideo === video.id) { stop(video.id); setHoveredVideo(null); } else { setHoveredVideo(video.id); play(video.id); } }}
            >
              <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 transition-all duration-300 shadow-2xl">
                <video
                  ref={(el) => { refs.current[video.id] = el; }}
                  src={video.src}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
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
