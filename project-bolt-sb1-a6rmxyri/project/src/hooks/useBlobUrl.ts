import { useState, useEffect, useRef } from 'react';

/**
 * 動画URLをBlob URLに変換するフック
 * 要素検査で元のファイル名を隠すためのコンテンツ保護機能
 */
export const useBlobUrl = (originalUrl: string | undefined | null): string | null => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!originalUrl) {
      setBlobUrl(null);
      return;
    }

    // 既にBlob URLの場合はそのまま返す
    if (originalUrl.startsWith('blob:')) {
      setBlobUrl(originalUrl);
      return;
    }

    let isMounted = true;

    const fetchAndConvert = async () => {
      try {
        const response = await fetch(originalUrl, {
          credentials: 'omit',
          cache: 'force-cache' // キャッシュを活用
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }

        const blob = await response.blob();

        if (isMounted) {
          // 古いObjectURLをクリーンアップ
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }

          const newObjectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = newObjectUrl;
          setBlobUrl(newObjectUrl);
        }
      } catch (error) {
        // エラー時はオリジナルURLにフォールバック
        if (isMounted) {
          console.warn('[useBlobUrl] Failed to convert, using original URL:', error);
          setBlobUrl(originalUrl);
        }
      }
    };

    fetchAndConvert();

    return () => {
      isMounted = false;
      // クリーンアップ時にObjectURLを解放
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [originalUrl]);

  return blobUrl;
};

export default useBlobUrl;
