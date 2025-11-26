export const downloadFileFromUrl = async (url: string, filename: string) => {
  // モバイル対応: タイムアウトを設定
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

  try {
    const response = await fetch(url, {
      credentials: 'omit',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to download file (${response.status})`);
    }

    const blob = await response.blob();

    // iOS Safari対応: Blob URLの代わりに直接開く方法を試す
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      // iOS/Safari: 新しいタブで開く（ダウンロードの代替）
      const objectUrl = URL.createObjectURL(blob);
      const newWindow = window.open(objectUrl, '_blank');
      if (!newWindow) {
        // ポップアップがブロックされた場合はリンクを使用
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // 遅延してURLを解放（ダウンロード完了を待つ）
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } else {
      // 通常のブラウザ: 従来の方法
      const objectUrl = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        // 少し遅延してから解放
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('ダウンロードがタイムアウトしました。ネットワーク接続を確認してください。');
    }
    throw error;
  }
};
