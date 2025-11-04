import React, { useState, useEffect } from 'react';
import { Activity, Clock, MemoryStick, Zap } from 'lucide-react';
import { usePerformance } from '../hooks/usePerformance';

interface PerformanceMonitorProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  isVisible = false, 
  position = 'bottom-right' 
}) => {
  const { performanceData } = usePerformance();
  const [fps, setFps] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // FPS計測
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setFps(Math.round(frameCount * 1000 / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    if (isVisible) {
      animationId = requestAnimationFrame(measureFPS);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isVisible]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'bottom-4 right-4';
    }
  };

  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className="glass-dark border border-white/20 rounded-xl p-3 min-w-[200px]">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-white text-sm font-medium">パフォーマンス</span>
          </div>
          <span className="text-xs text-gray-400">
            {isExpanded ? '−' : '+'}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {/* FPS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-300">FPS</span>
              </div>
              <span className={`text-xs font-mono ${getPerformanceStatus(60 - fps, { good: 10, warning: 20 })}`}>
                {fps}
              </span>
            </div>

            {/* メモリ使用量 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MemoryStick className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-gray-300">Memory</span>
              </div>
              <span className={`text-xs font-mono ${getPerformanceStatus(performanceData.memoryUsage, { good: 50, warning: 100 })}`}>
                {performanceData.memoryUsage.toFixed(1)}MB
              </span>
            </div>

            {/* レンダリング時間 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-300">Render</span>
              </div>
              <span className={`text-xs font-mono ${getPerformanceStatus(performanceData.renderTime, { good: 16, warning: 50 })}`}>
                {performanceData.renderTime.toFixed(1)}ms
              </span>
            </div>

            {/* ロード時間 */}
            {performanceData.loadTime > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-3 h-3 text-orange-400" />
                  <span className="text-xs text-gray-300">Load</span>
                </div>
                <span className={`text-xs font-mono ${getPerformanceStatus(performanceData.loadTime, { good: 2000, warning: 5000 })}`}>
                  {(performanceData.loadTime / 1000).toFixed(1)}s
                </span>
              </div>
            )}

            {/* パフォーマンス評価 */}
            <div className="border-t border-white/10 pt-2 mt-2">
              <div className="text-xs text-center">
                {fps >= 55 && performanceData.memoryUsage < 50 ? (
                  <span className="text-green-400">🟢 良好</span>
                ) : fps >= 45 && performanceData.memoryUsage < 100 ? (
                  <span className="text-yellow-400">🟡 注意</span>
                ) : (
                  <span className="text-red-400">🔴 改善必要</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;