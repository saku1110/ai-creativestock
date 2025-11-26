/**
 * Video Load Queue - 同時接続数を制限して動画を読み込む
 * ERR_INSUFFICIENT_RESOURCES エラーを防ぐためのユーティリティ
 */

const MAX_CONCURRENT_LOADS = 4;

type QueueItem = {
  videoElement: HTMLVideoElement;
  src: string;
  resolve: () => void;
  priority: number;
};

class VideoLoadQueue {
  private queue: QueueItem[] = [];
  private activeLoads = 0;

  /**
   * 動画をキューに追加して読み込みを開始
   * @param videoElement - 対象のvideo要素
   * @param src - 動画のURL
   * @param priority - 優先度（高いほど先に読み込む、デフォルト: 0）
   */
  enqueue(videoElement: HTMLVideoElement, src: string, priority = 0): Promise<void> {
    return new Promise((resolve) => {
      // 既にsrcが設定されている場合はスキップ
      if (videoElement.src === src) {
        resolve();
        return;
      }

      // 既にキューにある場合は優先度を更新
      const existingIndex = this.queue.findIndex(
        (item) => item.videoElement === videoElement
      );
      if (existingIndex !== -1) {
        this.queue[existingIndex].priority = Math.max(
          this.queue[existingIndex].priority,
          priority
        );
        this.sortQueue();
        resolve();
        return;
      }

      this.queue.push({ videoElement, src, resolve, priority });
      this.sortQueue();
      this.processQueue();
    });
  }

  /**
   * 優先度でキューをソート
   */
  private sortQueue() {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * キューを処理
   */
  private processQueue() {
    while (this.activeLoads < MAX_CONCURRENT_LOADS && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      // 要素がまだDOMにあるか確認
      if (!document.body.contains(item.videoElement)) {
        item.resolve();
        continue;
      }

      this.activeLoads++;

      const onLoad = () => {
        this.activeLoads--;
        item.resolve();
        cleanup();
        this.processQueue();
      };

      const onError = () => {
        this.activeLoads--;
        item.resolve();
        cleanup();
        this.processQueue();
      };

      const cleanup = () => {
        item.videoElement.removeEventListener('loadeddata', onLoad);
        item.videoElement.removeEventListener('error', onError);
      };

      item.videoElement.addEventListener('loadeddata', onLoad, { once: true });
      item.videoElement.addEventListener('error', onError, { once: true });

      // srcを設定して読み込み開始
      item.videoElement.src = item.src;
    }
  }

  /**
   * 特定の動画の優先度を上げる（可視状態になった時など）
   */
  prioritize(videoElement: HTMLVideoElement) {
    const index = this.queue.findIndex(
      (item) => item.videoElement === videoElement
    );
    if (index > 0) {
      this.queue[index].priority = 100;
      this.sortQueue();
    }
  }

  /**
   * キューから動画を削除（DOM削除時など）
   */
  remove(videoElement: HTMLVideoElement) {
    const index = this.queue.findIndex(
      (item) => item.videoElement === videoElement
    );
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      item.resolve();
    }
  }

  /**
   * 現在のキューサイズを取得
   */
  get queueSize(): number {
    return this.queue.length;
  }

  /**
   * アクティブな読み込み数を取得
   */
  get activeLoadCount(): number {
    return this.activeLoads;
  }
}

// シングルトンインスタンス
export const videoLoadQueue = new VideoLoadQueue();
