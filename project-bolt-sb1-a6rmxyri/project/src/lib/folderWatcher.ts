import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs/promises';
import { VideoProcessor, VideoMetadata, CategoryClassification } from './videoProcessor';
import { VideoCategory, VIDEO_CATEGORIES } from '../utils/categoryInference';
import sharp from 'sharp';
import { database } from './supabase';

// アップロードキューの型定義
interface UploadQueueItem {
  filePath: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  metadata?: VideoMetadata;
  classification?: CategoryClassification;
  timestamp: Date;
  categoryOverride?: VideoCategory;
}

// フォルダ監視設定
export interface WatcherConfig {
  watchFolder: string;
  processedFolder: string;
  failedFolder: string;
  autoUpload: boolean;
  deleteAfterUpload: boolean;
  addWatermark: boolean;
  watermarkPreset: 'diagonalPattern' | 'lightPattern' | 'densePattern' | 'ultraDensePattern' | 'single';
  // 画像ウォーターマーク（フルフレーム）設定（指定がある場合はこれを優先）
  watermarkImagePath?: string; // 例: ./brand/watermark-9x16.png
  watermarkImageOpacity?: number; // 0-1 デフォルト0.85
  categoryFromSubfolder?: boolean;
  categoryFolderMap?: Record<string, VideoCategory>;
}

// デフォルト設定
const DEFAULT_CONFIG: WatcherConfig = {
  watchFolder: './uploads/watch',
  processedFolder: './uploads/processed',
  failedFolder: './uploads/failed',
  autoUpload: true,
  deleteAfterUpload: false,
  addWatermark: true,
  watermarkPreset: 'diagonalPattern',
  watermarkImagePath: undefined,
  watermarkImageOpacity: 0.85,
  categoryFromSubfolder: false,
  categoryFolderMap: {
    beauty: 'beauty',
    fitness: 'fitness',
    haircare: 'haircare',
    business: 'business',
    lifestyle: 'lifestyle',
    '美容': 'beauty',
    'フィットネス': 'fitness',
    'ヘアケア': 'haircare',
    'ビジネス': 'business',
    '暮らし': 'lifestyle',
    'ライフスタイル': 'lifestyle'
  }
};

// フォルダ監視クラス
export class FolderWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private uploadQueue: Map<string, UploadQueueItem> = new Map();
  private isProcessing: boolean = false;
  private config: WatcherConfig;
  private onProgressCallback?: (item: UploadQueueItem) => void;
  private onErrorCallback?: (error: Error, item: UploadQueueItem) => void;
  private onCompleteCallback?: (item: UploadQueueItem) => void;

  constructor(config: Partial<WatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 必要なフォルダを作成
  private async ensureFolders(): Promise<void> {
    await fs.mkdir(this.config.watchFolder, { recursive: true });
    await fs.mkdir(this.config.processedFolder, { recursive: true });
    await fs.mkdir(this.config.failedFolder, { recursive: true });
    await fs.mkdir('./temp/frames', { recursive: true });
    await fs.mkdir('./temp/thumbnails', { recursive: true });
    await fs.mkdir('./temp/watermarked', { recursive: true });

    if (this.config.categoryFromSubfolder) {
      const map = this.config.categoryFolderMap || {};
      await Promise.all(
        Object.keys(map).map(async (folderName) => {
          const target = path.join(this.config.watchFolder, folderName);
          await fs.mkdir(target, { recursive: true }).catch(() => {});
        })
      );
    }
  }

  // イベントハンドラの設定
  onProgress(callback: (item: UploadQueueItem) => void): void {
    this.onProgressCallback = callback;
  }

  onError(callback: (error: Error, item: UploadQueueItem) => void): void {
    this.onErrorCallback = callback;
  }

  onComplete(callback: (item: UploadQueueItem) => void): void {
    this.onCompleteCallback = callback;
  }

  // 監視を開始
  async start(): Promise<void> {
    await this.ensureFolders();

    this.watcher = chokidar.watch(this.config.watchFolder, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleNewFile(filePath))
      .on('error', (error) => console.error('Watcher error:', error));

    console.log(`Watching folder: ${this.config.watchFolder}`);
  }

  // 監視を停止
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  // 新しいファイルを処理
  private async handleNewFile(filePath: string): Promise<void> {
    const ext = path.extname(filePath).toLowerCase();
    
    // MP4ファイルのみ処理
    if (ext !== '.mp4') {
      console.log(`Skipping non-MP4 file: ${filePath}`);
      return;
    }

    const fileName = path.basename(filePath);

    // すでにキューにある場合はスキップ
    if (this.uploadQueue.has(filePath)) {
      return;
    }

    const categoryOverride = this.deriveCategoryFromFolder(filePath);

    // キューに追加
    const queueItem: UploadQueueItem = {
      filePath,
      fileName,
      status: 'pending',
      timestamp: new Date(),
      categoryOverride
    };

    this.uploadQueue.set(filePath, queueItem);
    console.log(`Added to queue: ${fileName}`);

    // 自動アップロードが有効な場合は処理を開始
    if (this.config.autoUpload) {
      this.processQueue();
    }
  }

  private deriveCategoryFromFolder(filePath: string): VideoCategory | undefined {
    if (!this.config.categoryFromSubfolder) return undefined;
    const relativePath = path.relative(this.config.watchFolder, filePath);
    if (!relativePath || relativePath.startsWith('..')) return undefined;
    const segments = relativePath.split(path.sep).filter(Boolean);
    if (segments.length <= 1) return undefined;
    const folder = segments[0];
    const map = this.config.categoryFolderMap || {};

    const mapped = map[folder] || map[folder.toLowerCase()];
    if (mapped) return mapped;

    const normalized = folder.toLowerCase();
    const direct = (VIDEO_CATEGORIES as string[]).find(cat => cat === normalized);
    if (direct) return normalized as VideoCategory;

    return undefined;
  }

  // アップロードキューを処理
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    for (const [filePath, item] of this.uploadQueue) {
      if (item.status === 'pending') {
        await this.processFile(item);
      }
    }

    this.isProcessing = false;
  }

  // ファイルを処理
  private async processFile(item: UploadQueueItem): Promise<void> {
    try {
      item.status = 'processing';
      this.onProgressCallback?.(item);

      console.log(`Processing: ${item.fileName}`);

      // 動画の検証
      const validation = await VideoProcessor.validateVideo(item.filePath);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // ウォーターマークを追加（設定が有効な場合）
      let processedVideoPath = item.filePath;
      if (this.config.addWatermark) {
        const imgWm = this.config.watermarkImagePath || process.env.WATERMARK_IMAGE_PATH;
        if (imgWm) {
          console.log('Adding image watermark (full-frame)...');
          const watermarkedPath = path.join('./temp/watermarked', `watermarked_${item.fileName}`);
          const imgResult = await VideoProcessor.addFullFrameImageWatermark(
            item.filePath,
            watermarkedPath,
            imgWm,
            this.config.watermarkImageOpacity ?? 0.85
          );
          if (imgResult.success && imgResult.outputPath) {
            processedVideoPath = imgResult.outputPath;
            console.log('Image watermark added successfully');
          } else {
            console.warn(`Failed to add image watermark: ${imgResult.error}`);
          }
        } else {
          console.log('Adding text watermark (preset)...');
          const watermarkedPath = path.join('./temp/watermarked', `watermarked_${item.fileName}`);
          const watermarkResult = await VideoProcessor.addWatermark(
            item.filePath,
            watermarkedPath,
            this.config.watermarkPreset
          );
          if (watermarkResult.success && watermarkResult.outputPath) {
            processedVideoPath = watermarkResult.outputPath;
            console.log(`Watermark added successfully: ${this.config.watermarkPreset} pattern`);
          } else {
            console.warn(`Failed to add watermark: ${watermarkResult.error}`);
          }
        }
      }

      // メタデータの抽出
      console.log('Extracting metadata...');
      item.metadata = await VideoProcessor.extractMetadata(processedVideoPath);
      this.onProgressCallback?.(item);

      // ファイル名からカテゴリを先行推定
      const filenameClassification = VideoProcessor.classifyFilename(item.fileName, item.filePath);
      item.classification = filenameClassification;
      this.onProgressCallback?.(item);

      // カテゴリの自動分類
      console.log('Classifying video...');
      item.classification = await VideoProcessor.classifyVideo(processedVideoPath);
      this.onProgressCallback?.(item);

      if (item.categoryOverride) {
        const previousClassification = item.classification;
        const keywords = new Set<string>(previousClassification?.keywords ?? []);
        keywords.add(item.categoryOverride);
        const beautySubCategory = item.categoryOverride === 'beauty'
          ? previousClassification?.beautySubCategory
          : undefined;
        item.classification = {
          category: item.categoryOverride,
          confidence: 1,
          keywords: Array.from(keywords).slice(0, 10),
          source: 'manual',
          beautySubCategory
        };
        this.onProgressCallback?.(item);
      }

      // サムネイルの生成
      console.log('Generating thumbnail...');
      let thumbnailPath = await VideoProcessor.generateThumbnail(processedVideoPath);

      // 画像ウォーターマーク指定時はサムネにもロゴ合成（フルフレーム）
      const imgWmForThumb = this.config.watermarkImagePath || process.env.WATERMARK_IMAGE_PATH;
      if (this.config.addWatermark && imgWmForThumb) {
        try {
          const meta = await sharp(thumbnailPath).metadata();
          const wmBuf = await sharp(imgWmForThumb)
            .resize(meta.width || 720, meta.height || 1280, { fit: 'cover' })
            .toBuffer();
          const thumbOut = thumbnailPath.replace(/\.jpg$/i, '_wm.jpg');
          await sharp(thumbnailPath)
            .composite([{ input: wmBuf, gravity: 'northwest', blend: 'over', opacity: this.config.watermarkImageOpacity ?? 0.85 }])
            .jpeg({ quality: 90 })
            .toFile(thumbOut);
          // もとのサムネイルは削除し、以後はウォーターマーク済みを使用
          await fs.unlink(thumbnailPath).catch(() => {});
          thumbnailPath = thumbOut;
        } catch (e) {
          console.warn('Failed to apply watermark to thumbnail:', (e as Error).message);
        }
      }
      
      // タグの生成
      const classificationForTags = item.classification ?? VideoProcessor.classifyFilename(item.fileName, item.filePath);
      const tags = await VideoProcessor.generateTags(item.metadata, classificationForTags);

      // Supabaseにアップロード
      if (this.config.autoUpload) {
        console.log('Uploading to Supabase...');
        await this.uploadToSupabase(item, thumbnailPath, tags, processedVideoPath);
      }

      // 成功したファイルを処理済みフォルダに移動
      const destPath = path.join(this.config.processedFolder, item.fileName);
      
      if (this.config.deleteAfterUpload) {
        await fs.unlink(item.filePath);
      } else {
        await fs.rename(item.filePath, destPath);
      }

      // サムネイルファイルを削除
      await fs.unlink(thumbnailPath).catch(() => {})
      
      // ウォーターマーク付き一時ファイルを削除
      if (processedVideoPath !== item.filePath) {
        await fs.unlink(processedVideoPath).catch(() => {});
      }

      item.status = 'completed';
      this.onCompleteCallback?.(item);
      
      console.log(`Completed: ${item.fileName}`);
      
      // キューから削除
      this.uploadQueue.delete(item.filePath);

    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Failed to process ${item.fileName}:`, error);
      
      // 失敗したファイルを失敗フォルダに移動
      try {
        const destPath = path.join(this.config.failedFolder, item.fileName);
        await fs.rename(item.filePath, destPath);
      } catch (moveError) {
        console.error('Failed to move file to failed folder:', moveError);
      }

      this.onErrorCallback?.(error as Error, item);
      
      // キューから削除
      this.uploadQueue.delete(item.filePath);
    }
  }

  // Supabaseにアップロード
  private async uploadToSupabase(
    item: UploadQueueItem,
    thumbnailPath: string,
    tags: string[],
    videoPath: string = item.filePath
  ): Promise<void> {
    if (!item.metadata || !item.classification) {
      throw new Error('Missing metadata or classification');
    }

    // 動画ファイルを読み込み（ウォーターマーク付きのパスを使用）
    const videoBuffer = await fs.readFile(videoPath);
    const videoFile = new File([videoBuffer], item.fileName, { type: 'video/mp4' });
    const category = item.categoryOverride ?? item.classification?.category ?? 'lifestyle';

    if (item.categoryOverride && (!item.classification || item.classification.category !== item.categoryOverride)) {
      item.classification = {
        category,
        confidence: 1,
        keywords: item.classification?.keywords ?? [],
        source: 'manual'
      };
    }

    // サムネイルファイルを読み込み
    const thumbnailBuffer = await fs.readFile(thumbnailPath);
    const thumbnailFile = new File([thumbnailBuffer], `${path.basename(item.fileName, '.mp4')}.jpg`, { type: 'image/jpeg' });

    // Supabaseに動画をアップロード
    const { data: videoData, error: videoError } = await database.uploadVideo(videoFile, category);
    if (videoError) throw videoError;

    // Supabaseにサムネイルをアップロード
    const { data: thumbnailData, error: thumbnailError } = await database.uploadThumbnail(thumbnailFile, category);
    if (thumbnailError) throw thumbnailError;

    // 動画アセット情報を保存
    const title = path.basename(item.fileName, '.mp4')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const { error: saveError } = await database.createVideoAsset({
      title,
      description: `Category: ${category}, Confidence: ${((item.classification?.confidence ?? 0) * 100).toFixed(1)}%`,
      category,
      tags,
      duration: item.metadata.duration,
      resolution: item.metadata.resolution,
      file_url: videoData.publicUrl,
      thumbnail_url: thumbnailData.publicUrl,
      is_featured: false,
      beauty_sub_category: category === 'beauty'
        ? item.classification?.beautySubCategory ?? null
        : null
    });

    if (saveError) throw saveError;
  }

  // 手動でファイルを処理
  async processFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const item: UploadQueueItem = {
      filePath,
      fileName,
      status: 'pending',
      timestamp: new Date()
    };

    await this.processFile(item);
  }

  // キューの状態を取得
  getQueueStatus(): UploadQueueItem[] {
    return Array.from(this.uploadQueue.values());
  }

  // 特定のファイルの状態を取得
  getFileStatus(filePath: string): UploadQueueItem | undefined {
    return this.uploadQueue.get(filePath);
  }

  // キューをクリア
  clearQueue(): void {
    this.uploadQueue.clear();
  }
}

export default FolderWatcher;
