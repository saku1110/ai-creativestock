import React, { useEffect, useMemo, useRef, useState } from 'react';
import { localLpGridVideos } from '../local-content';
import { fetchSupabaseVideos, stem } from '../lib/media';

interface VideoGalleryProps {
  onTrialRequest: () => void;
}

type GalleryVideo = {
  id: string;
  title: string;
  src: string;
};

const FALLBACK_GALLERY_VIDEOS: GalleryVideo[] = [
  { id: 'sample-1', title: 'Sample 1', src: '/videos/sample1.mp4' },
  { id: 'sample-2', title: 'Sample 2', src: '/videos/sample2.mp4' },
  { id: 'sample-3', title: 'Sample 3', src: '/videos/sample3.mp4' },
  { id: 'sample-4', title: 'Sample 4', src: '/videos/sample4.mp4' },
  { id: 'sample-5', title: 'Sample 5', src: '/videos/sample5.mp4' },
  { id: 'sample-6', title: 'Sample 6', src: '/videos/sample1.mp4' },
  { id: 'sample-7', title: 'Sample 7', src: '/videos/sample2.mp4' },
  { id: 'sample-8', title: 'Sample 8', src: '/videos/sample3.mp4' },
  { id: 'sample-9', title: 'Sample 9', src: '/videos/sample4.mp4' },
  { id: 'sample-10', title: 'Sample 10', src: '/videos/sample5.mp4' },
  { id: 'sample-11', title: 'Sample 11', src: '/videos/sample1.mp4' },
  { id: 'sample-12', title: 'Sample 12', src: '/videos/sample2.mp4' },
  { id: 'sample-13', title: 'Sample 13', src: '/videos/sample3.mp4' },
  { id: 'sample-14', title: 'Sample 14', src: '/videos/sample4.mp4' },
  { id: 'sample-15', title: 'Sample 15', src: '/videos/sample5.mp4' },
  { id: 'sample-16', title: 'Sample 16', src: '/videos/sample1.mp4' }
];

const LOCAL_GALLERY_VIDEOS: GalleryVideo[] = localLpGridVideos.map(video => ({
  id: video.id,
  title: video.title,
  src: video.url
}));

const VideoGallery: React.FC<VideoGalleryProps> = ({ onTrialRequest }) => {
  const [remoteVideos, setRemoteVideos] = useState<GalleryVideo[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const vids = await fetchSupabaseVideos({ bucket: 'local-content', prefix: 'lp-grid', limit: 200, expires: 3600 });
        if (!vids || vids.length === 0) return;
        const items: GalleryVideo[] = vids.map((v, idx) => ({
          id: `sb-${idx}-${v.path}`,
          title: stem(v.path).replace(/[-_]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          src: v.url
        }));
        setRemoteVideos(items);
      } catch {
        // ignore
      }
    })();
  }, []);

  const GALLERY_VIDEOS: GalleryVideo[] = useMemo(() => {
    const base = remoteVideos && remoteVideos.length > 0
      ? remoteVideos
      : (LOCAL_GALLERY_VIDEOS.length > 0 ? LOCAL_GALLERY_VIDEOS : FALLBACK_GALLERY_VIDEOS);
    return base.slice(0, 16);
  }, [remoteVideos]);

  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  const play = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    const p = el.play();
    if (p && typeof (p as Promise<void>).catch === 'function') {
      (p as Promise<void>).catch(() => {});
    }
  };

  const stop = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    try { el.pause(); el.currentTime = 0; } catch {}
  };

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

