import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import {
  inferCategoryFromFilename,
  resolveBeautySubCategory,
  type BeautySubCategory,
  type CategoryClassification,
  type VideoCategory
} from '../utils/categoryInference';
import { VideoWatermarkProcessor, WatermarkPresets } from './videoWatermark';

export type { VideoCategory, CategoryClassification } from '../utils/categoryInference';

// ffmpegのパスを設定
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// 動画メタデータの型定義
export interface VideoMetadata {
  duration: number;
  resolution: string;
  frameRate: number;
  bitrate: number;
  codec: string;
  size: number;
  format: string;
}

// キーワードからカテゴリへのマッピング
const categoryKeywords: Record<VideoCategory, string[]> = {
  beauty: ['cosmetics', 'makeup', 'lipstick', 'face', 'skin', 'beauty', 'foundation', 'mascara', 'eyeshadow', 'perfume', 'nail', 'polish', 'serum', 'cream', 'tooth', 'dental', 'oral', 'whitening', 'shampoo', 'conditioner'],
  fitness: ['gym', 'exercise', 'workout', 'sport', 'fitness', 'muscle', 'running', 'yoga', 'dumbbell', 'bicycle', 'athletic', 'training'],
  haircare: ['hair', 'salon', 'hairstyle', 'barber', 'shampoo', 'conditioner', 'haircut', 'hairdresser', 'wig', 'brush', 'comb'],
  business: ['office', 'business', 'suit', 'computer', 'laptop', 'desk', 'meeting', 'conference', 'presentation', 'document', 'corporate', 'professional'],
  lifestyle: ['home', 'living', 'kitchen', 'bedroom', 'furniture', 'decoration', 'plant', 'coffee', 'food', 'travel', 'leisure', 'relaxation']
};

const beautySubCategoryTagMap: Record<BeautySubCategory, { tag: string; label: string }> = {
  skincare: { tag: 'beauty:skincare', label: 'スキンケア' },
  haircare: { tag: 'beauty:haircare', label: 'ヘアケア' },
  oralcare: { tag: 'beauty:oralcare', label: 'オーラルケア' }
};

// 動画処理クラス
export class VideoProcessor {
  private static modelInstance: mobilenet.MobileNet | null = null;

  // TensorFlow.jsモデルの初期化
  private static async initializeModel(): Promise<mobilenet.MobileNet> {
    if (!this.modelInstance) {
      await tf.ready();
      this.modelInstance = await mobilenet.load();
    }
    return this.modelInstance;
  }

  // 動画からメタデータを抽出
  static async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        // r_frame_rate は "30000/1001" のような形式が来る場合があるため安全にパース
        let fps = 0;
        const rate = (videoStream as any).r_frame_rate as string | undefined;
        if (rate) {
          if (rate.includes('/')) {
            const [num, den] = rate.split('/').map((n: string) => Number(n));
            fps = den ? num / den : Number(rate) || 0;
          } else {
            fps = Number(rate) || 0;
          }
        }

        resolve({
          duration: Math.round((metadata.format.duration as number) || 0),
          resolution: `${(videoStream as any).width}x${(videoStream as any).height}`,
          frameRate: fps,
          bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate)) : 0,
          codec: (videoStream as any).codec_name || 'unknown',
          size: metadata.format.size ? parseInt(String(metadata.format.size)) : 0,
          format: String(metadata.format.format_name || 'unknown')
        });
      });
    });
  }

  // 動画から複数のフレームを抽出
  static async extractFrames(videoPath: string, count: number = 5): Promise<string[]> {
    const outputDir = path.join(process.cwd(), 'temp', 'frames', Date.now().toString());
    await fs.mkdir(outputDir, { recursive: true });

    const framePaths: string[] = [];

    return new Promise((resolve, reject) => {
      // 動画の長さを取得
      ffmpeg.ffprobe(videoPath, async (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = metadata.format.duration || 10;
        const interval = duration / (count + 1);

        // 各フレームを抽出
        const promises: Promise<void>[] = [];
        for (let i = 1; i <= count; i++) {
          const timestamp = interval * i;
          const outputPath = path.join(outputDir, `frame_${i}.jpg`);
          framePaths.push(outputPath);

          const promise = new Promise<void>((res, rej) => {
            ffmpeg(videoPath)
              .seekInput(timestamp)
              .frames(1)
              .output(outputPath)
              .on('end', () => res())
              .on('error', rej)
              .run();
          });

          promises.push(promise);
        }

        try {
          await Promise.all(promises);
          resolve(framePaths);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // サムネイルを生成
  static async generateThumbnail(videoPath: string, outputPath?: string): Promise<string> {
    const thumbnailPath = outputPath || path.join(process.cwd(), 'temp', 'thumbnails', `${Date.now()}.jpg`);
    const dir = path.dirname(thumbnailPath);
    await fs.mkdir(dir, { recursive: true });

    return new Promise((resolve, reject) => {
      // 動画の2秒地点からサムネイルを生成
      ffmpeg(videoPath)
        .seekInput(2)
        .frames(1)
        .output(thumbnailPath)
        .size('720x1280') // 9:16 aspect ratio
        .on('end', () => resolve(thumbnailPath))
        .on('error', reject)
        .run();
    });
  }

  // ファイル名からカテゴリを推定
  static classifyFilename(fileName: string, filePath?: string): CategoryClassification {
    return inferCategoryFromFilename(fileName, { filePath });
  }

  // 画像を分析してカテゴリを判定
  static async classifyImage(imagePath: string): Promise<{ className: string; probability: number }[]> {
    const model = await this.initializeModel();
    
    // 画像を読み込んでリサイズ
    const imageBuffer = await fs.readFile(imagePath);
    const processedImage = await sharp(imageBuffer)
      .resize(224, 224)
      .toBuffer();

    // TensorFlowテンソルに変換
    const imageTensor = tf.browser.fromPixels(
      await sharp(processedImage).raw().toBuffer() as any
    );

    // 予測を実行
    const predictions = await model.classify(imageTensor);
    
    // テンソルをクリーンアップ
    imageTensor.dispose();

    return predictions;
  }

  // 動画からカテゴリを自動判定
  static async classifyVideo(videoPath: string): Promise<CategoryClassification> {
    const filenameGuess = inferCategoryFromFilename(path.basename(videoPath), { filePath: videoPath });

    if (filenameGuess.confidence >= 0.7) {
      return filenameGuess;
    }

    try {
      // 複数のフレームを抽出
      const framePaths = await this.extractFrames(videoPath, 3);
      
      // 各フレームを分析
      const allPredictions: { className: string; probability: number }[] = [];
      for (const framePath of framePaths) {
        const predictions = await this.classifyImage(framePath);
        allPredictions.push(...predictions);
      }

      // キーワードを収集
      const detectedKeywords = new Set<string>();
      const categoryScores: Record<VideoCategory, number> = {
        beauty: 0,
        fitness: 0,
        haircare: 0,
        business: 0,
        lifestyle: 0
      };

      // 予測結果からキーワードを抽出し、カテゴリスコアを計算
      for (const prediction of allPredictions) {
        const className = prediction.className.toLowerCase();
        const words = className.split(/[,\s]+/);
        
        for (const word of words) {
          detectedKeywords.add(word);
          
          // 各カテゴリのキーワードと照合
          for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(kw => word.includes(kw) || kw.includes(word))) {
              categoryScores[category as VideoCategory] += prediction.probability;
            }
          }
        }
      }

      // 最もスコアの高いカテゴリを選択
      let bestCategory: VideoCategory = 'lifestyle';
      let bestScore = 0;
      
      for (const [category, score] of Object.entries(categoryScores)) {
        if (score > bestScore) {
          bestScore = score;
          bestCategory = category as VideoCategory;
        }
      }

      // デフォルトカテゴリとして lifestyle を使用
      if (bestScore === 0) {
        bestCategory = 'lifestyle';
        bestScore = 0.5;
      }

      // フレーム画像を削除
      for (const framePath of framePaths) {
        await fs.unlink(framePath).catch(() => {});
      }

      const confidence = allPredictions.length > 0
        ? Math.min(bestScore / allPredictions.length, 1)
        : 0;

      const modelClassification: CategoryClassification = {
        category: bestCategory,
        confidence,
        keywords: Array.from(detectedKeywords).slice(0, 10),
        source: 'model'
      };

      const mergedKeywords = new Set<string>([
        ...modelClassification.keywords,
        ...filenameGuess.keywords
      ]);

      let resolvedBeautySubCategory: BeautySubCategory | undefined = filenameGuess.beautySubCategory;

      if (bestCategory === 'beauty' || filenameGuess.category === 'beauty') {
        const fileNameTokens = path.basename(videoPath)
          .toLowerCase()
          .replace(/\.[^.]+$/, '')
          .split(/[\s_\-]+/)
          .filter(Boolean);

        const beautyResult = resolveBeautySubCategory({
          tokens: fileNameTokens,
          keywords: Array.from(new Set<string>([
            ...mergedKeywords,
            ...Array.from(detectedKeywords)
          ]))
        });

        if (beautyResult.subCategory) {
          resolvedBeautySubCategory = beautyResult.subCategory;
          beautyResult.matched.forEach(value => mergedKeywords.add(value));
        }

        if (resolvedBeautySubCategory) {
          mergedKeywords.add(resolvedBeautySubCategory);
        }
      }

      if (filenameGuess.confidence >= 0.6 && filenameGuess.category !== modelClassification.category) {
        return {
          ...filenameGuess,
          confidence: Math.max(filenameGuess.confidence, modelClassification.confidence),
          keywords: Array.from(mergedKeywords).slice(0, 10),
          source: 'filename',
          beautySubCategory: filenameGuess.category === 'beauty'
            ? resolvedBeautySubCategory ?? filenameGuess.beautySubCategory
            : undefined
        };
      }

      return {
        ...modelClassification,
        keywords: Array.from(mergedKeywords).slice(0, 10),
        beautySubCategory: modelClassification.category === 'beauty'
          ? resolvedBeautySubCategory
          : undefined
      };

    } catch (error) {
      console.error('Video classification error:', error);
      // エラー時はファイル名ベースの推定を使用
      return filenameGuess;
    }
  }

  // 動画ファイルの検証
  static async validateVideo(videoPath: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const metadata = await this.extractMetadata(videoPath);
      
      // ファイル形式チェック
      const allowedFormats = ['mp4', 'mov', 'avi', 'webm'];
      const format = metadata.format.toLowerCase();
      if (!allowedFormats.some(f => format.includes(f))) {
        errors.push(`Unsupported format: ${format}. Allowed formats: ${allowedFormats.join(', ')}`);
      }
      
      // 動画の長さチェック（10秒）
      if (metadata.duration < 9 || metadata.duration > 11) {
        errors.push(`Video duration must be 10 seconds (current: ${metadata.duration}s)`);
      }
      
      // ファイルサイズチェック（100MB以下）
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (metadata.size > maxSize) {
        errors.push(`File size exceeds 100MB limit (current: ${(metadata.size / 1024 / 1024).toFixed(2)}MB)`);
      }
      
      // 解像度チェック
      const [width, height] = metadata.resolution.split('x').map(Number);
      if (width < 720 || height < 720) {
        errors.push(`Resolution too low. Minimum 720p required (current: ${metadata.resolution})`);
      }
      
    } catch (error) {
      errors.push(`Failed to validate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // 動画情報を抽出してタグを生成
  static async generateTags(metadata: VideoMetadata, classification: CategoryClassification): string[] {
    const tags: string[] = [];
    
    // カテゴリタグ
    tags.push(classification.category);

    if (classification.category === 'beauty' && classification.beautySubCategory) {
      const meta = beautySubCategoryTagMap[classification.beautySubCategory];
      tags.push(meta.tag);
      tags.push(meta.label);
    }
    
    // 解像度タグ
    const [width, height] = metadata.resolution.split('x').map(Number);
    if (width >= 3840) tags.push('4K');
    else if (width >= 1920) tags.push('Full HD');
    else if (width >= 1280) tags.push('HD');
    
    // アスペクト比タグ
    const aspectRatio = width / height;
    if (Math.abs(aspectRatio - 9/16) < 0.1) tags.push('9:16');
    else if (Math.abs(aspectRatio - 16/9) < 0.1) tags.push('16:9');
    else if (Math.abs(aspectRatio - 1) < 0.1) tags.push('1:1');
    
    // 動画の長さタグ
    tags.push(`${metadata.duration}秒`);
    
    // 分類キーワードから関連タグを追加
    const relevantKeywords = classification.keywords
      .filter(kw => kw.length > 3)
      .slice(0, 5);
    tags.push(...relevantKeywords);
    
    return [...new Set(tags)]; // 重複を除去
  }

  // 動画にウォーターマークを追加
  static async addWatermark(
    inputPath: string,
    outputPath: string,
    preset: keyof typeof WatermarkPresets = 'diagonalPattern'
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      const watermarkConfig = WatermarkPresets[preset];
      const result = await VideoWatermarkProcessor.addTextWatermark(
        inputPath,
        outputPath,
        watermarkConfig
      );
      
      return result;
    } catch (error) {
      console.error('Watermark processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add watermark'
      };
    }
  }

  // バッチ処理でウォーターマークを追加
  static async batchAddWatermark(
    videos: Array<{ inputPath: string; outputPath: string }>,
    preset: keyof typeof WatermarkPresets = 'diagonalPattern',
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<Array<{ inputPath: string; result: { success: boolean; outputPath?: string; error?: string } }>> {
    const results: Array<{ inputPath: string; result: { success: boolean; outputPath?: string; error?: string } }> = [];
    
    for (let i = 0; i < videos.length; i++) {
      const { inputPath, outputPath } = videos[i];
      const filename = path.basename(inputPath);
      
      if (onProgress) {
        onProgress(i + 1, videos.length, filename);
      }
      
      const result = await this.addWatermark(inputPath, outputPath, preset);
      results.push({ inputPath, result });
    }
    
    return results;
  }

  // 画像(フルフレーム)ウォーターマークを追加（ロゴPNGを9:16全面に重ねる用途）
  static async addFullFrameImageWatermark(
    inputPath: string,
    outputPath: string,
    watermarkImagePath: string,
    opacity = 0.85
  ): Promise<{ success: boolean; outputPath?: string; error?: string }> {
    try {
      const result = await VideoWatermarkProcessor.addFullFrameImageWatermark(
        inputPath,
        watermarkImagePath,
        outputPath,
        opacity
      );
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add image watermark'
      };
    }
  }
}

export default VideoProcessor;
