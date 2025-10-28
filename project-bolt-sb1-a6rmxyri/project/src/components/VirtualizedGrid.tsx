import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemWidth: number;
  itemHeight: number;
  gap?: number;
  className?: string;
  overscan?: number;
}

function VirtualizedGrid<T>({
  items,
  renderItem,
  itemWidth,
  itemHeight,
  gap = 16,
  className = '',
  overscan = 5
}: VirtualizedGridProps<T>) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // レスポンシブなカラム数を計算
  const columnCount = useMemo(() => {
    if (containerSize.width === 0) return 1;
    return Math.floor((containerSize.width + gap) / (itemWidth + gap)) || 1;
  }, [containerSize.width, itemWidth, gap]);

  const rowCount = useMemo(() => {
    return Math.ceil(items.length / columnCount);
  }, [items.length, columnCount]);

  // コンテナサイズを監視
  useEffect(() => {
    if (!containerRef) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // グリッドアイテムをレンダリング
  const GridCell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex];

    if (!item) return null;

    return (
      <div
        style={{
          ...style,
          left: style.left + gap / 2,
          top: style.top + gap / 2,
          width: style.width - gap,
          height: style.height - gap,
        }}
      >
        {renderItem(item, itemIndex)}
      </div>
    );
  }, [items, columnCount, gap, renderItem]);

  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-gray-400">アイテムがありません</p>
      </div>
    );
  }

  return (
    <div 
      ref={setContainerRef}
      className={`w-full ${className}`}
      style={{ height: '600px' }} // デフォルトの高さ
    >
      {containerSize.width > 0 && (
        <Grid
          columnCount={columnCount}
          columnWidth={itemWidth + gap}
          height={containerSize.height || 600}
          rowCount={rowCount}
          rowHeight={itemHeight + gap}
          width={containerSize.width}
          overscanRowCount={overscan}
          overscanColumnCount={overscan}
          className="custom-scrollbar"
        >
          {GridCell}
        </Grid>
      )}
    </div>
  );
}

export default VirtualizedGrid;