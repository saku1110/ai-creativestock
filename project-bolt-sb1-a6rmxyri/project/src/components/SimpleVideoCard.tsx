import React, { useRef, useState } from 'react';
import { VideoAsset } from '../types';

type Props = {
  video: VideoAsset;
};

const SimpleVideoCard: React.FC<Props> = ({ video }) => {
  const vidRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const start = async () => {
    const el = vidRef.current;
    if (!el || !video.videoUrl) return;
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

        {/* inline video */}
        {video.videoUrl && (
          <video
            ref={vidRef}
            src={video.videoUrl}
            muted
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${playing ? 'opacity-100' : 'opacity-0'}`}
            onContextMenu={(e) => { e.preventDefault(); return false; }}
          />
        )}
      </div>
    </div>
  );
};

export default SimpleVideoCard;
