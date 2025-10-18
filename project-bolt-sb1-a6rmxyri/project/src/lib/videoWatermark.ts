// FFmpegを使った動画ウォーターマーク処理システム
// ブラウザ環境では使用不可（Node.js環境のみ）
let spawn: any;
let fs: any;
let path: any;

// サーバーサイドでのみimport
if (typeof window === 'undefined') {
  try {
    spawn = require('child_process').spawn;
    fs = require('fs').promises;
    path = require('path');
  } catch (error) {
    console.warn('Node.js modules not available in browser environment');
  }
}

export interface WatermarkConfig {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'diagonal-pattern';
  opacity: number; // 0.0 - 1.0
  fontSize: number;
  color: string;
  fontFile?: string;
  spacing?: number; // 斜めパターン用の間隔
  angle?: number; // 斜めパターン用の角度
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * FFmpegを使った動画ウォーターマーク処理クラス
 */
export class VideoWatermarkProcessor {
  private static readonly DEFAULT_CONFIG: WatermarkConfig = {
    text: 'AI Creative Stock',
    position: 'diagonal-pattern',
    opacity: 0.3,
    fontSize: 32,
    color: 'white',
    spacing: 200,
    angle: -30
  };

  /**
   * 動画にテキストウォーターマークを追加
   */
  static async addTextWatermark(
    inputPath: string,
    outputPath: string,
    config: Partial<WatermarkConfig> = {}
  ): Promise<ProcessingResult> {
    // ブラウザ環境では使用不可
    if (typeof window !== 'undefined') {
      return {
        success: false,
        error: 'この機能はサーバーサイドでのみ利用可能です'
      };
    }

    const startTime = Date.now();
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    try {
      // 出力ディレクトリが存在することを確認
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      let textFilter: string;
      
      if (finalConfig.position === 'diagonal-pattern') {
        // 斜めパターンウォーターマーク
        textFilter = this.createDiagonalPatternFilter(finalConfig);
      } else {
        // 単一ウォーターマーク
        const position = this.getTextPosition(finalConfig.position);
        textFilter = [
          `drawtext=text='${finalConfig.text}'`,
          `fontsize=${finalConfig.fontSize}`,
          `fontcolor=${finalConfig.color}@${finalConfig.opacity}`,
          `x=${position.x}`,
          `y=${position.y}`,
          finalConfig.fontFile ? `fontfile='${finalConfig.fontFile}'` : '',
          'enable=\'between(t,0,99999)\''
        ].filter(Boolean).join(':');
      }

      const args = [
        '-i', inputPath,
        '-vf', textFilter,
        '-codec:a', 'copy',
        '-y', // 出力ファイルを上書き
        outputPath
      ];

      await this.runFFmpeg(args);

      const duration = Date.now() - startTime;
      return {
        success: true,
        outputPath,
        duration
      };
    } catch (error) {
      console.error('ウォーターマーク処理エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ウォーターマーク処理に失敗しました',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * フルフレームの画像ウォーターマークを追加（動画サイズに合わせて画像をリサイズして0:0に合成）
   */
  static async addFullFrameImageWatermark(
    inputPath: string,
    watermarkImagePath: string,
    outputPath: string,
    opacity = 0.8
  ): Promise<ProcessingResult> {
    // ブラウザ環境では使用不可
    if (typeof window !== 'undefined') {
      return {
        success: false,
        error: 'この機能はサーバーサイドでのみ利用可能です'
      };
    }

    const startTime = Date.now();

    try {
      const info = await this.getVideoInfo(inputPath);
      if (!info?.width || !info?.height) {
        throw new Error('動画解像度の取得に失敗しました');
      }

      // 透過PNGを動画の解像度にリサイズ
      const sharp = require('sharp');
      const path = require('path');
      const fs = require('fs').promises;
      const tempDir = path.join(process.cwd(), 'temp', 'wm');
      await fs.mkdir(tempDir, { recursive: true });
      const resizedWm = path.join(tempDir, `wm_${info.width}x${info.height}.png`);

      await sharp(watermarkImagePath)
        .resize(info.width, info.height, { fit: 'cover' })
        .png()
        .toFile(resizedWm);

      // 合成（0:0に重ねる）。透明度はcolorchannelmixerで制御
      const args = [
        '-i', inputPath,
        '-i', resizedWm,
        '-filter_complex', `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=0:0`,
        '-codec:a', 'copy',
        '-y',
        outputPath
      ];

      await this.runFFmpeg(args);

      // 後片付け
      await fs.unlink(resizedWm).catch(() => {});

      return {
        success: true,
        outputPath,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'フルフレーム画像ウォーターマークに失敗しました',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 動画に画像ウォーターマークを追加
   */
  static async addImageWatermark(
    inputPath: string,
    watermarkImagePath: string,
    outputPath: string,
    position: WatermarkConfig['position'] = 'bottom-right',
    opacity: number = 0.7
  ): Promise<ProcessingResult> {
    // ブラウザ環境では使用不可
    if (typeof window !== 'undefined') {
      return {
        success: false,
        error: 'この機能はサーバーサイドでのみ利用可能です'
      };
    }

    const startTime = Date.now();

    try {
      // 出力ディレクトリが存在することを確認
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // ポジション設定
      const pos = this.getImagePosition(position);
      
      // オーバーレイフィルター設定
      const overlayFilter = `overlay=${pos.x}:${pos.y}:format=auto:alpha=${opacity}`;

      const args = [
        '-i', inputPath,
        '-i', watermarkImagePath,
        '-filter_complex', overlayFilter,
        '-codec:a', 'copy',
        '-y',
        outputPath
      ];

      await this.runFFmpeg(args);

      const duration = Date.now() - startTime;
      return {
        success: true,
        outputPath,
        duration
      };
    } catch (error) {
      console.error('画像ウォーターマーク処理エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '画像ウォーターマーク処理に失敗しました',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 複数の動画にバッチでウォーターマークを追加
   */
  static async batchProcess(
    inputDirectory: string,
    outputDirectory: string,
    config: Partial<WatermarkConfig> = {},
    onProgress?: (current: number, total: number, filename: string) => void
  ): Promise<{
    success: boolean;
    processed: number;
    failed: number;
    results: Array<{ filename: string; result: ProcessingResult }>;
  }> {
    // ブラウザ環境では使用不可
    if (typeof window !== 'undefined') {
      return {
        success: false,
        processed: 0,
        failed: 0,
        results: []
      };
    }

    try {
      // 入力ディレクトリの動画ファイルを取得
      const files = await fs.readdir(inputDirectory);
      const videoFiles = files.filter(file => 
        /\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i.test(file)
      );

      if (videoFiles.length === 0) {
        throw new Error('処理対象の動画ファイルが見つかりません');
      }

      // 出力ディレクトリを作成
      await fs.mkdir(outputDirectory, { recursive: true });

      const results: Array<{ filename: string; result: ProcessingResult }> = [];
      let processed = 0;
      let failed = 0;

      for (let i = 0; i < videoFiles.length; i++) {
        const filename = videoFiles[i];
        const inputPath = path.join(inputDirectory, filename);
        const outputPath = path.join(outputDirectory, `watermarked_${filename}`);

        onProgress?.(i + 1, videoFiles.length, filename);

        const result = await this.addTextWatermark(inputPath, outputPath, config);
        results.push({ filename, result });

        if (result.success) {
          processed++;
        } else {
          failed++;
        }
      }

      return {
        success: true,
        processed,
        failed,
        results
      };
    } catch (error) {
      console.error('バッチ処理エラー:', error);
      return {
        success: false,
        processed: 0,
        failed: 0,
        results: []
      };
    }
  }

  /**
   * FFmpegコマンドを実行
   */
  private static runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);

      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * 斜めパターンウォーターマークフィルターを作成
   */
  private static createDiagonalPatternFilter(config: WatermarkConfig): string {
    const spacing = config.spacing || 200;
    const angle = config.angle || -30;
    
    // 動画全体を覆うように複数のウォーターマークを斜めに配置
    const filters: string[] = [];
    
    // 画面全体を確実にカバーするため、より広い範囲に配置
    // 4K動画でも対応できるよう、十分な数のウォーターマークを配置
    for (let row = -5; row <= 15; row++) {
      for (let col = -5; col <= 20; col++) {
        const baseX = col * spacing;
        const baseY = row * spacing;
        
        // 斜めの配置計算（各行をずらす）
        const offsetX = row * (spacing * 0.5);
        
        const filter = [
          `drawtext=text='${config.text}'`,
          `fontsize=${config.fontSize}`,
          `fontcolor=${config.color}@${config.opacity}`,
          `x=${baseX + offsetX}`,
          `y=${baseY}`,
          config.fontFile ? `fontfile='${config.fontFile}'` : '',
          'enable=\'between(t,0,99999)\''
        ].filter(Boolean).join(':');
        
        filters.push(filter);
      }
    }
    
    // 複数のdrawtextフィルターをチェーン接続
    return filters.join(',');
  }

  /**
   * テキストウォーターマークの位置を計算
   */
  private static getTextPosition(position: WatermarkConfig['position']): { x: string; y: string } {
    switch (position) {
      case 'top-left':
        return { x: '10', y: '10' };
      case 'top-right':
        return { x: 'w-tw-10', y: '10' };
      case 'bottom-left':
        return { x: '10', y: 'h-th-10' };
      case 'bottom-right':
        return { x: 'w-tw-10', y: 'h-th-10' };
      case 'center':
        return { x: '(w-tw)/2', y: '(h-th)/2' };
      case 'diagonal-pattern':
        return { x: '0', y: '0' }; // パターンでは使用しない
      default:
        return { x: 'w-tw-10', y: 'h-th-10' };
    }
  }

  /**
   * 画像ウォーターマークの位置を計算
   */
  private static getImagePosition(position: WatermarkConfig['position']): { x: string; y: string } {
    switch (position) {
      case 'top-left':
        return { x: '10', y: '10' };
      case 'top-right':
        return { x: 'main_w-overlay_w-10', y: '10' };
      case 'bottom-left':
        return { x: '10', y: 'main_h-overlay_h-10' };
      case 'bottom-right':
        return { x: 'main_w-overlay_w-10', y: 'main_h-overlay_h-10' };
      case 'center':
        return { x: '(main_w-overlay_w)/2', y: '(main_h-overlay_h)/2' };
      default:
        return { x: 'main_w-overlay_w-10', y: 'main_h-overlay_h-10' };
    }
  }

  /**
   * FFmpegが利用可能かチェック
   */
  static async checkFFmpegAvailability(): Promise<boolean> {
    try {
      await this.runFFmpeg(['-version']);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 動画の情報を取得
   */
  static async getVideoInfo(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    format: string;
  } | null> {
    try {
      return new Promise((resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
          '-v', 'quiet',
          '-print_format', 'json',
          '-show_format',
          '-show_streams',
          videoPath
        ]);

        let output = '';

        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });

        ffprobe.on('close', (code) => {
          if (code === 0) {
            try {
              const info = JSON.parse(output);
              const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
              
              resolve({
                duration: parseFloat(info.format.duration),
                width: videoStream.width,
                height: videoStream.height,
                format: info.format.format_name
              });
            } catch (parseError) {
              reject(parseError);
            }
          } else {
            reject(new Error(`ffprobe failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error('動画情報取得エラー:', error);
      return null;
    }
  }
}

/**
 * プリセットウォーターマーク設定
 */
export const WatermarkPresets = {
  // 斜めパターン（デフォルト・推奨）
  diagonalPattern: {
    text: 'AI Creative Stock',
    position: 'diagonal-pattern' as const,
    opacity: 0.25,
    fontSize: 36,
    color: 'white',
    spacing: 180,
    angle: -30
  },
  
  // 軽いパターン（目立ちにくい）
  lightPattern: {
    text: 'AI Creative Stock',
    position: 'diagonal-pattern' as const,
    opacity: 0.15,
    fontSize: 28,
    color: 'white',
    spacing: 220,
    angle: -25
  },
  
  // 密集パターン（最も強い保護）
  densePattern: {
    text: 'AI Creative Stock',
    position: 'diagonal-pattern' as const,
    opacity: 0.35,
    fontSize: 32,
    color: 'white',
    spacing: 120,
    angle: -35
  },
  
  // 超密集パターン（最強の保護）
  ultraDensePattern: {
    text: 'AI Creative Stock',
    position: 'diagonal-pattern' as const,
    opacity: 0.4,
    fontSize: 40,
    color: 'white',
    spacing: 100,
    angle: -30
  },
  
  // 単一（従来・非推奨）
  single: {
    text: 'AI Creative Stock',
    position: 'bottom-right' as const,
    opacity: 0.7,
    fontSize: 24,
    color: 'white'
  }
};

export default VideoWatermarkProcessor;
