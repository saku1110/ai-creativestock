import React, { useEffect, useMemo, useRef, useState } from 'react';
import { localLpGridVideos } from '../local-content';
import { fetchSupabaseVideos, fetchSupabaseImages, stem } from '../lib/media';

interface VideoGalleryProps {
  onTrialRequest: () => void;
}

type GalleryVideo = {
  id: string;
  title: string;
  src: string;
  thumbnail?: string;
};

const MAX_GALLERY_ITEMS = 16;

const normalizeSourceKey = (src?: string) => {
  if (!src) return '';
  const [base] = src.split('?');
  return (base || src).toLowerCase();
};

const buildUniqueGalleryList = (...sources: GalleryVideo[][]): GalleryVideo[] => {
  const seen = new Set<string>();
  const result: GalleryVideo[] = [];
  for (const group of sources) {
    for (const video of group) {
      const key = normalizeSourceKey(video.src) || video.id.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      result.push(video);
      if (result.length >= MAX_GALLERY_ITEMS) return result;
    }
  }
  return result;
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
        // 動画とサムネイル画像を並行取得
        const [vids, imgs] = await Promise.all([
          fetchSupabaseVideos({ bucket: 'local-content', prefix: 'lp-grid', limit: 32, expires: 3600 }),
          fetchSupabaseImages({ bucket: 'local-content', prefix: 'lp-grid', limit: 100, expires: 3600 })
        ]);
        if (!vids || vids.length === 0) return;

        // 画像をstem名でマップ化（動画と画像のマッチング用）
        const thumbMap = new Map<string, string>();
        imgs.forEach(img => {
          const imgStem = stem(img.path);
          if (!thumbMap.has(imgStem)) {
            thumbMap.set(imgStem, img.url);
          }
        });

        const seenPaths = new Set<string>();
        const items: GalleryVideo[] = [];
        vids.forEach((v, idx) => {
          const normalizedPath = (v.path || `sb-${idx}`).toLowerCase();
          if (seenPaths.has(normalizedPath)) return;
          seenPaths.add(normalizedPath);
          const videoStem = stem(v.path);
          items.push({
            id: `sb-${idx}-${v.path}`,
            title: videoStem.replace(/[-_]+/g, ' ').replace(/\s{2,}/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            src: v.url,
            thumbnail: thumbMap.get(videoStem)
          });
        });
        setRemoteVideos(items);
      } catch {
        // ignore
      }
    })();
  }, []);

  const GALLERY_VIDEOS: GalleryVideo[] = useMemo(() => {
    return buildUniqueGalleryList(
      remoteVideos || [],
      LOCAL_GALLERY_VIDEOS,
      FALLBACK_GALLERY_VIDEOS
    );
  }, [remoteVideos]);

  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  const play = async (id: string) => {
    const el = refs.current[id];
    if (!el) return;

    // srcが未設定の場合はdata-srcから設定
    if (!el.src && el.dataset.src) {
      el.src = el.dataset.src;
      // 読み込み完了を待つ
      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          el.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        el.addEventListener('canplay', onCanPlay, { once: true });
        el.load();
      });
    }

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
                {/* サムネイル画像（先に表示） */}
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hoveredVideo === video.id ? 'opacity-0' : 'opacity-100'}`}
                    loading="lazy"
                  />
                )}
                {/* 動画（ホバー時に表示） */}
                <video
                  ref={(el) => { refs.current[video.id] = el; }}
                  data-src={video.src}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hoveredVideo === video.id ? 'opacity-100' : 'opacity-0'}`}
                  muted
                  playsInline
                  preload="none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoGallery;
