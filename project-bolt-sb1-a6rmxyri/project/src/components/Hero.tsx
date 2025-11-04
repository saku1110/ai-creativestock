import React, { useEffect, useMemo, useRef, useState } from 'react';
import { localHeroVideos } from '../local-content';
import { fetchSupabaseVideos } from '../lib/media';

interface HeroProps {
  onAuthRequest: () => void;
  onPurchaseRequest?: () => void;
}

type HeroVideoItem = {
  id: string;
  title: string;
  src: string;
};

const FALLBACK_HERO_VIDEOS: HeroVideoItem[] = [
  { id: 'sample-1', title: 'Sample 1', src: '/videos/sample1.mp4' },
  { id: 'sample-2', title: 'Sample 2', src: '/videos/sample2.mp4' },
  { id: 'sample-3', title: 'Sample 3', src: '/videos/sample3.mp4' },
  { id: 'sample-4', title: 'Sample 4', src: '/videos/sample4.mp4' },
  { id: 'sample-5', title: 'Sample 5', src: '/videos/sample5.mp4' }
];

const LOCAL_HERO_VIDEOS: HeroVideoItem[] = localHeroVideos.length > 0
  ? localHeroVideos.map(video => ({ id: video.id, title: video.title, src: video.url }))
  : FALLBACK_HERO_VIDEOS;

const playSilently = (videoEl: HTMLVideoElement | null) => {
  if (!videoEl) return;
  const playPromise = videoEl.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // autoplay may be blocked; ignore and continue
    });
  }
};

type HeroVideoCardProps = {
  video: HeroVideoItem;
  register: (container: HTMLElement | null, video: HTMLVideoElement | null) => void;
  onReady: (src: string) => void;
};

const HeroVideoCard: React.FC<HeroVideoCardProps> = ({ video, register, onReady }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let notified = false;
    const notifyReady = () => {
      if (notified) return;
      notified = true;
      onReady(video.src);
    };

    const primeFrame = () => {
      try {
        const sampleTime = Math.min(el.duration || 0.3, 0.3);
        el.currentTime = sampleTime;
      } catch {
        // ignore seek errors
      } finally {
        el.pause();
        notifyReady();
      }
    };

    if (el.readyState >= 2) {
      primeFrame();
    } else {
      const onLoaded = () => primeFrame();
      el.addEventListener('loadeddata', onLoaded, { once: true });
      return () => {
        el.removeEventListener('loadeddata', onLoaded);
      };
    }
  }, [video.src, onReady]);

  useEffect(() => {
    const cleanup = register(containerRef.current, videoRef.current);
    return () => {
      cleanup();
    };
  }, [register, video.src]);

  return (
    <div
      ref={containerRef}
      className="relative w-40 sm:w-48 lg:w-60 xl:w-64 flex-shrink-0"
      data-hero-card
    >
      <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-800 to-gray-900 rounded-[28px] overflow-hidden border border-white/10 shadow-[0_25px_70px_-30px_rgba(15,23,42,0.7)]">
        <video
          ref={videoRef}
          src={video.src}
          className="w-full h-full object-cover" crossOrigin="anonymous"
          muted
          playsInline autoPlay onError={() => onReady(video.src)}
          preload="metadata"
          loop
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>
    </div>
  );
};

type RegisteredItem = {
  video: HTMLVideoElement;
  isPlaying: boolean;
};

const Hero: React.FC<HeroProps> = ({ onAuthRequest, onPurchaseRequest }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const speedPerMsRef = useRef<number>(0.02);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemsRef = useRef<Map<Element, RegisteredItem>>(new Map());
  const [remoteVideos, setRemoteVideos] = useState<HeroVideoItem[] | null>(null);
  const videos = remoteVideos && remoteVideos.length > 0 ? remoteVideos : LOCAL_HERO_VIDEOS;
  const uniqueVideoCount = useMemo(() => new Set(videos.map((v) => v.src)).size, [videos]);
  // Start in a not-ready state to avoid any motion before deciding the actual source list
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(isReady);
  const loadedVideosRef = useRef<Set<string>>(new Set());

  // Try to load videos from Supabase Storage when available
  useEffect(() => {
    (async () => {
      try {
        const items = await fetchSupabaseVideos({ bucket: 'local-content', prefix: 'hero', limit: 50, expires: 21600 });
        if (items && items.length > 0) {
          setRemoteVideos(
            items.map((it, idx) => ({ id: `sb-${idx}-${it.path}`, title: it.path.split('/').pop() || 'Clip', src: it.url }))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const computeSpeed = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLDivElement>('[data-hero-card]');
    if (cards.length === 0) return;

    const cardRect = cards[0].getBoundingClientRect();
    const cardWidth = cardRect.width;
    const distance = container.clientWidth + cardWidth;

    // 9秒で右端から左端まで通過
    speedPerMsRef.current = distance / 9000;
  };

  const registerVideo = React.useCallback(
    (container: HTMLElement | null, video: HTMLVideoElement | null) => {
      if (!container || !video) {
        return () => {};
      }

      itemsRef.current.set(container, { video, isPlaying: false });
      if (observerRef.current) {
        observerRef.current.observe(container);
      }

      return () => {
        itemsRef.current.delete(container);
        if (observerRef.current) {
          observerRef.current.unobserve(container);
        }
      };
    },
    []
  );

  const handleVideoReady = React.useCallback(
    (src: string) => {
      if (uniqueVideoCount === 0 || isReadyRef.current) {
        return;
      }

      const loaded = loadedVideosRef.current;
      if (!loaded.has(src)) {
        loaded.add(src);
        if (loaded.size >= uniqueVideoCount) {
          setIsReady(true);
        }
      }
    },
    [uniqueVideoCount]
  );

  // Ensure autoplay/scroll doesn't start until the current video list has loaded
  // Reset readiness tracking whenever the `videos` list changes (e.g., after remote fetch)
  useEffect(() => {
    loadedVideosRef.current.clear();
    // Always go back to not-ready on list changes; will become ready when all report onReady
    isReadyRef.current = false;
    setIsReady(false);
  }, [videos, uniqueVideoCount]);

  useEffect(() => {
    isReadyRef.current = isReady;

    if (!isReady) {
      itemsRef.current.forEach((state) => {
        if (state.isPlaying) {
          state.isPlaying = false;
          state.video.pause();
        }
      });
      return;
    }

    itemsRef.current.forEach((state, container) => {
      const rect = container.getBoundingClientRect();
      const width = rect.width || 1;
      const visible =
        Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
      const ratio = visible / width;
      if (ratio >= 0.5 && !state.isPlaying) {
        state.isPlaying = true;
        state.video.currentTime = 0;
        playSilently(state.video);
      }
    });
  }, [isReady]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const state = itemsRef.current.get(entry.target);
          if (!state) return;
          const { video } = state;

          if (!isReadyRef.current) {
            if (state.isPlaying) {
              state.isPlaying = false;
              video.pause();
            }
            return;
          }

          if (!document.hidden && entry.intersectionRatio >= 0.1) {
            if (!state.isPlaying) {
              state.isPlaying = true;
              video.currentTime = 0;
              playSilently(video);
            }
          } else if (entry.intersectionRatio <= 0.02) {
            if (state.isPlaying) {
              state.isPlaying = false;
              video.pause();
            }
          }
        });
      },
      {
        root: null,
        threshold: [0, 0.02, 0.1, 0.25, 0.5, 0.75, 1]
      }
    );

    observerRef.current = observer;
    itemsRef.current.forEach((_, container) => observer.observe(container));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        itemsRef.current.forEach((state) => {
          if (state.isPlaying) {
            state.isPlaying = false;
            state.video.pause();
          }
        });
      } else {
        if (!isReadyRef.current) {
          return;
        }
        itemsRef.current.forEach((state, container) => {
          const rect = container.getBoundingClientRect();
          const width = rect.width || 1;
          const visible =
            Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
          const ratio = visible / width;
          if (ratio >= 0.5) {
            if (!state.isPlaying) {
              state.isPlaying = true;
              state.video.currentTime = 0;
              playSilently(state.video);
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    computeSpeed();

    let animationFrame: number;
    let lastTimestamp: number | null = null;
    let wasReady = false;

    const tick = (timestamp: number) => {
      const el = scrollContainerRef.current;
      if (!el) return;

      if (!isReadyRef.current) {
        // Ready状態が変わったとき�EみリセチE��
        if (wasReady) {
          lastTimestamp = null;
          wasReady = false;
        }
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      // Ready状態になった直後�EタイムスタンプをリセチE��
      if (!wasReady) {
        lastTimestamp = null;
        wasReady = true;
      }

      const track = el.querySelector<HTMLDivElement>('[data-hero-track]');
      if (!track) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      const maxShift = track.scrollWidth / 2;
      if (maxShift > el.clientWidth) {
        if (lastTimestamp === null) {
          lastTimestamp = timestamp;
        }
        const delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        // deltaが異常に大きい場合（タブ�Eり替えなど�E��EスキチE�E
        if (delta < 100) {
          el.scrollLeft += speedPerMsRef.current * delta;
          if (el.scrollLeft >= maxShift) {
            el.scrollLeft -= maxShift;
          }
        }
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const el = scrollContainerRef.current;
      if (el) {
        el.scrollLeft = 0;
      }
      computeSpeed();
    });

    const container = scrollContainerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => observer.disconnect();
  }, []);

  const doubledVideos = videos.length > 0 ? [...videos, ...videos] : [];

  useEffect(() => {
    computeSpeed();
  }, [doubledVideos.length]);

  return (
    <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
      {/* 背景エフェクチE*/}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 to-purple-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1000ms' }}
        ></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight">
            実�E級�E
            <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent"> AI動画素杁E/span>
            で<br />
            マ�EケチE��ングめE            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent"> 加送E/span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
            月顁E,800冁E��実�E級�E高品質AI動画素材が手に入めE            <br className="hidden sm:block" />
            モチE��・撮影不要。即ダウンロードで啁E��利用OK
          </p>

          <div className="relative overflow-hidden py-8 mb-8">
            <div
              ref={scrollContainerRef}
              className="relative overflow-hidden"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)'
              }}
            >
              <div
            className="flex items-center gap-3 sm:gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8"
            data-hero-track
          >
            {doubledVideos.map((video, index) => (
              <HeroVideoCard
                key={`${video.id}-${index}`}
                video={video}
                register={registerVideo}
                onReady={handleVideoReady}
              />
            ))}
          </div>
        </div>
      </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={onAuthRequest}
              className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-blue-500/25"
            >
              AI動画素材一覧を見る
            </button>

            <button
              onClick={onPurchaseRequest || onAuthRequest}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-green-500/25"
            >
              今すぐ利用する
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;


