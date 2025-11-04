import { useState, useEffect, useCallback } from 'react';

/**
 * パフォーマンス監視のためのフック
 */
export function usePerformance() {
  const [performanceData, setPerformanceData] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0
  });

  // レンダリング時間を測定
  const measureRenderTime = useCallback((startTime: number) => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    setPerformanceData(prev => ({
      ...prev,
      renderTime
    }));

    return renderTime;
  }, []);

  // メモリ使用量を監視
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setPerformanceData(prev => ({
        ...prev,
        memoryUsage: memory.usedJSHeapSize / 1024 / 1024 // MB
      }));
    }
  }, []);

  // ページロード時間を測定
  useEffect(() => {
    const loadTime = performance.timing 
      ? performance.timing.loadEventEnd - performance.timing.navigationStart
      : 0;
    
    setPerformanceData(prev => ({
      ...prev,
      loadTime
    }));

    // 定期的にメモリ使用量をチェック
    const interval = setInterval(checkMemoryUsage, 5000);
    
    return () => clearInterval(interval);
  }, [checkMemoryUsage]);

  return {
    performanceData,
    measureRenderTime,
    checkMemoryUsage
  };
}

/**
 * 重い計算処理をバックグラウンドで実行するフック
 */
export function useAsyncComputation<T>(
  computeFn: () => T,
  dependencies: React.DependencyList
) {
  const [result, setResult] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    setIsLoading(true);
    setError(null);

    // 次のフレームで実行して UI をブロックしない
    const timeoutId = setTimeout(() => {
      try {
        const computed = computeFn();
        if (!cancelled) {
          setResult(computed);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('計算エラー'));
          setIsLoading(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, dependencies);

  return { result, isLoading, error };
}