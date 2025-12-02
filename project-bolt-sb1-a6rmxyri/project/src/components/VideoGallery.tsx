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


const LOCAL_GALLERY_VIDEOS: GalleryVideo[] = localLpGridVideos.map(video => ({
  id: video.id,
  title: video.title,
  src: video.url
}));

const VideoGallery: React.FC<VideoGalleryProps> = ({ onTrialRequest }) => {
  const [remoteVideos, setRemoteVideos] = useState<GalleryVideo[] | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // タッチデバイス判定（スマホ・タブレット）
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const vids = await fetchSupabaseVideos({ bucket: 'local-content', prefix: 'lp-grid', limit: 32, expires: 3600 });
        if (!vids || vids.length === 0) return;

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
            src: v.url
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
      LOCAL_GALLERY_VIDEOS
    );
  }, [remoteVideos]);

  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [errorVideos, setErrorVideos] = useState<Set<string>>(new Set());
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  const handleVideoError = (videoId: string) => {
    setErrorVideos(prev => new Set(prev).add(videoId));
  };

  const validVideos = useMemo(() =>
    GALLERY_VIDEOS.filter(v => !errorVideos.has(v.id)),
    [GALLERY_VIDEOS, errorVideos]
  );

  const play = async (id: string) => {
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
          {validVideos.map((video) => (
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
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  playsInline
                  autoPlay={isMobile}
                  loop={isMobile}
                  preload={isMobile ? 'auto' : 'metadata'}
                  onError={() => handleVideoError(video.id)}
                  onContextMenu={(e) => { e.preventDefault(); return false; }}
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-400 text-sm mt-4">
          ※プランご契約後、ロゴ（透かし）なしの動画をダウンロードいただけます
        </p>
      </div>
    </section>
  );
};

export default VideoGallery;
