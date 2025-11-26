import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoAsset } from '../types';

type Props = {
  video: VideoAsset;
};

const SimpleVideoCard: React.FC<Props> = ({ video }) => {
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 動画srcを設定して読み込み
  const loadVideo = useCallback(() => {
    const el = vidRef.current;
    if (!el || !video.videoUrl || isLoaded) return;
    if (!el.src) {
      el.src = video.videoUrl;
    }
    setIsLoaded(true);
  }, [video.videoUrl, isLoaded]);

  // IntersectionObserverでビューポート近接時に読み込み準備
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !video.videoUrl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // ビューポートに近づいたら読み込み開始
          loadVideo();
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [loadVideo, video.videoUrl]);

  const start = async () => {
    const el = vidRef.current;
    if (!el || !video.videoUrl) return;

    // srcが未設定の場合は設定
    if (!el.src) {
      el.src = video.videoUrl;
      setIsLoaded(true);
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

    try {
      await el.play();
      setPlaying(true);
    } catch {
      // ignore
    }
  };

  const stop = () => {
    const el = vidRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}
    setPlaying(false);
  };

  const toggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    playing ? stop() : void start();
  };

  return (
    <div
      ref={containerRef}
      className="glass-dark rounded-2xl sm:rounded-3xl shadow-2xl transition-all duration-500 overflow-hidden border border-white/10 hover-lift"
      onMouseEnter={start}
      onMouseLeave={stop}
      onClick={toggle}
      onTouchStart={toggle}
    >
      <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black overflow-hidden">
        {/* fallback thumbnail */}
        <img
          src={video.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          onContextMenu={(e) => { e.preventDefault(); return false; }}
          onDragStart={(e) => { e.preventDefault(); return false; }}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        />

        {/* inline video - srcは遅延設定 */}
        {video.videoUrl && (
          <video
            ref={vidRef}
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${playing ? 'opacity-100' : 'opacity-0'}`}
            onContextMenu={(e) => { e.preventDefault(); return false; }}
          />
        )}
      </div>
    </div>
  );
};

export default SimpleVideoCard;
