#!/usr/bin/env node

/**
 * 斜めタイル状ウォーターマーク生成スクリプト
 * 
 * より高度な斜めパターンのウォーターマークを生成します。
 * 背景透明のPNG画像を作成してからオーバーレイする方式を使用。
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DiagonalWatermarkGenerator {
  /**
   * 斜めタイル状のウォーターマーク画像を生成
   */
  static async createDiagonalTileImage(config = {}) {
    const {
      text = 'AI Creative Stock',
      width = 1920,
      height = 1080,
      fontSize = 32,
      color = 'white',
      opacity = 0.3,
      spacing = 200,
      angle = -30,
      outputPath = './temp/diagonal_watermark.png'
    } = config;

    // 出力ディレクトリを作成
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // ImageMagickを使って斜めパターンの画像を生成
    const args = [
      // キャンバスサイズ設定
      '-size', `${width}x${height}`,
      'canvas:transparent',
      
      // フォント設定
      '-font', 'Arial-Bold',
      '-pointsize', fontSize.toString(),
      '-fill', `${color}`,
      '-alpha', 'set',
      
      // 斜めパターンの描画
      '-draw', this.generateDrawCommands(text, width, height, spacing, angle, opacity),
      
      // 出力
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const magick = spawn('convert', args);
      
      let errorOutput = '';
      
      magick.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      magick.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`ImageMagick failed: ${errorOutput}`));
        }
      });
      
      magick.on('error', (error) => {
        // ImageMagickが利用できない場合はFFmpegで代替
        console.warn('ImageMagickが利用できません。FFmpegで代替処理を実行します。');
        resolve(this.createWithFFmpeg(config));
      });
    });
  }

  /**
   * ImageMagick用の描画コマンドを生成
   */
  static generateDrawCommands(text, width, height, spacing, angle, opacity) {
    const commands = [];
    const angleRad = (angle * Math.PI) / 180;
    
    // グリッド状に配置
    for (let y = -spacing; y <= height + spacing; y += spacing) {
      for (let x = -spacing; x <= width + spacing; x += spacing) {
        // 斜めオフセット計算
        const offsetX = (y / spacing) * (spacing * 0.5);
        const finalX = x + offsetX;
        
        // 透明度を適用
        commands.push(`fill rgba(255,255,255,${opacity})`);
        commands.push(`text ${Math.round(finalX)},${y} '${text}'`);
      }
    }
    
    return commands.join(' ');
  }

  /**
   * FFmpegを使った代替実装
   */
  static async createWithFFmpeg(config) {
    const {
      text = 'AI Creative Stock',
      width = 1920,
      height = 1080,
      fontSize = 32,
      color = 'white',
      opacity = 0.3,
      spacing = 200,
      outputPath = './temp/diagonal_watermark.png'
    } = config;

    // 複数のdrawtextフィルターを組み合わせ
    const filters = [];
    
    for (let row = -2; row <= Math.ceil(height / spacing) + 2; row++) {
      for (let col = -2; col <= Math.ceil(width / spacing) + 2; col++) {
        const x = col * spacing + (row * spacing * 0.5);
        const y = row * spacing;
        
        filters.push(
          `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${color}@${opacity}:x=${x}:y=${y}`
        );
      }
    }

    const args = [
      '-f', 'lavfi',
      '-i', `color=c=transparent:s=${width}x${height}:d=1`,
      '-vf', filters.join(','),
      '-frames:v', '1',
      '-y',
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      
      let errorOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed: ${errorOutput}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * 生成したウォーターマーク画像を動画に適用
   */
  static async applyToVideo(videoPath, watermarkPath, outputPath, opacity = 0.3) {
    const args = [
      '-i', videoPath,
      '-i', watermarkPath,
      '-filter_complex', `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[ovr];[0:v][ovr]overlay=0:0`,
      '-codec:a', 'copy',
      '-y',
      outputPath
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);
      
      let errorOutput = '';
      
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`Video processing failed: ${errorOutput}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        reject(new Error(`FFmpeg spawn error: ${error.message}`));
      });
    });
  }

  /**
   * ワンステップでウォーターマーク処理
   */
  static async processVideo(inputPath, outputPath, config = {}) {
    try {
      console.log('📐 斜めパターンウォーターマーク画像を生成中...');
      
      // ウォーターマーク画像を生成
      const watermarkPath = await this.createDiagonalTileImage({
        ...config,
        outputPath: './temp/diagonal_watermark.png'
      });
      
      console.log('✅ ウォーターマーク画像を生成しました:', watermarkPath);
      console.log('🎬 動画にウォーターマークを適用中...');
      
      // 動画に適用
      await this.applyToVideo(inputPath, watermarkPath, outputPath, config.opacity);
      
      console.log('✅ ウォーターマーク処理が完了しました:', outputPath);
      
      // 一時ファイルをクリーンアップ
      await fs.unlink(watermarkPath).catch(() => {});
      
      return {
        success: true,
        outputPath
      };
    } catch (error) {
      console.error('❌ ウォーターマーク処理エラー:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// コマンドライン実行
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
使用方法:
  node scripts/create-diagonal-watermark.js <input.mp4> <output.mp4> [options]

オプション:
  --text <text>         ウォーターマークテキスト (デフォルト: "AI Creative Stock")
  --spacing <pixels>    テキスト間隔 (デフォルト: 200)
  --opacity <0.0-1.0>   透明度 (デフォルト: 0.3)
  --font-size <size>    フォントサイズ (デフォルト: 32)
  --color <color>       文字色 (デフォルト: white)
  --angle <degrees>     角度 (デフォルト: -30)

例:
  node scripts/create-diagonal-watermark.js input.mp4 output.mp4
  node scripts/create-diagonal-watermark.js input.mp4 output.mp4 --opacity 0.5 --spacing 150
`);
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1];
  
  // オプション解析
  const config = {
    text: 'AI Creative Stock',
    spacing: 200,
    opacity: 0.3,
    fontSize: 32,
    color: 'white',
    angle: -30
  };

  for (let i = 2; i < args.length; i += 2) {
    const option = args[i];
    const value = args[i + 1];

    switch (option) {
      case '--text':
        config.text = value;
        break;
      case '--spacing':
        config.spacing = parseInt(value);
        break;
      case '--opacity':
        config.opacity = parseFloat(value);
        break;
      case '--font-size':
        config.fontSize = parseInt(value);
        break;
      case '--color':
        config.color = value;
        break;
      case '--angle':
        config.angle = parseInt(value);
        break;
    }
  }

  console.log('🎬 斜めパターンウォーターマーク処理を開始します...');
  console.log('⚙️  設定:', config);
  
  const result = await DiagonalWatermarkGenerator.processVideo(inputPath, outputPath, config);
  
  if (result.success) {
    console.log('🎉 処理が完了しました!');
  } else {
    console.error('❌ 処理に失敗しました:', result.error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().catch(error => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = DiagonalWatermarkGenerator;