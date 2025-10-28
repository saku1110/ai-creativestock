#!/usr/bin/env node

/**
 * 動画ウォーターマーク バッチ処理スクリプト
 * 
 * 使用方法:
 * node scripts/watermark-batch.js [inputDir] [outputDir] [options]
 * 
 * 例:
 * node scripts/watermark-batch.js ./uploads ./watermarked --text "AI Creative Stock" --position bottom-right
 */

const { VideoWatermarkProcessor } = require('../src/lib/videoWatermark');
const path = require('path');
const fs = require('fs').promises;

// コマンドライン引数の解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputDir: args[0] || './uploads',
    outputDir: args[1] || './watermarked',
    text: 'AI Creative Stock',
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 24,
    color: 'white',
    fontFile: null,
    help: false
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--text':
        if (nextArg) options.text = nextArg;
        i++;
        break;
      case '--position':
        if (nextArg && ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(nextArg)) {
          options.position = nextArg;
        }
        i++;
        break;
      case '--opacity':
        if (nextArg) {
          const opacity = parseFloat(nextArg);
          if (opacity >= 0 && opacity <= 1) {
            options.opacity = opacity;
          }
        }
        i++;
        break;
      case '--font-size':
        if (nextArg) {
          const fontSize = parseInt(nextArg);
          if (fontSize > 0) {
            options.fontSize = fontSize;
          }
        }
        i++;
        break;
      case '--color':
        if (nextArg) options.color = nextArg;
        i++;
        break;
      case '--font-file':
        if (nextArg) options.fontFile = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// ヘルプメッセージ
function showHelp() {
  console.log(`
動画ウォーターマーク バッチ処理スクリプト

使用方法:
  node scripts/watermark-batch.js [inputDir] [outputDir] [options]

引数:
  inputDir          入力ディレクトリ (デフォルト: ./uploads)
  outputDir         出力ディレクトリ (デフォルト: ./watermarked)

オプション:
  --text <text>           ウォーターマークテキスト (デフォルト: "AI Creative Stock")
  --position <position>   位置 (top-left|top-right|bottom-left|bottom-right|center)
  --opacity <opacity>     透明度 0.0-1.0 (デフォルト: 0.7)
  --font-size <size>      フォントサイズ (デフォルト: 24)
  --color <color>         文字色 (デフォルト: white)
  --font-file <path>      フォントファイルパス (オプション)
  --help, -h              このヘルプを表示

例:
  # 基本的な使用方法
  node scripts/watermark-batch.js ./uploads ./watermarked

  # カスタム設定
  node scripts/watermark-batch.js ./uploads ./watermarked \\
    --text "My Watermark" \\
    --position center \\
    --opacity 0.5 \\
    --font-size 32 \\
    --color red

  # 特定のフォントを使用
  node scripts/watermark-batch.js ./uploads ./watermarked \\
    --font-file "/path/to/font.ttf"

対応形式:
  mp4, avi, mov, mkv, wmv, flv, webm

必要条件:
  - FFmpeg がインストールされていること
  - Node.js 14.0 以上
`);
}

// プログレス表示
function showProgress(current, total, filename) {
  const percentage = Math.round((current / total) * 100);
  const progressBar = '█'.repeat(Math.round(percentage / 2)) + '░'.repeat(50 - Math.round(percentage / 2));
  
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`進行状況: [${progressBar}] ${percentage}% (${current}/${total}) 処理中: ${filename}`);
}

// メイン処理
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🎬 動画ウォーターマーク バッチ処理を開始します...\n');

  // FFmpegの可用性チェック
  console.log('FFmpegの可用性をチェック中...');
  const ffmpegAvailable = await VideoWatermarkProcessor.checkFFmpegAvailability();
  
  if (!ffmpegAvailable) {
    console.error('❌ エラー: FFmpegが見つかりません。');
    console.error('FFmpegをインストールしてパスを通してください。');
    console.error('インストール方法: https://ffmpeg.org/download.html');
    process.exit(1);
  }
  console.log('✅ FFmpegが利用可能です\n');

  // 入力ディレクトリの存在確認
  try {
    await fs.access(options.inputDir);
  } catch (error) {
    console.error(`❌ エラー: 入力ディレクトリが見つかりません: ${options.inputDir}`);
    process.exit(1);
  }

  // 設定情報の表示
  console.log('📋 処理設定:');
  console.log(`   入力ディレクトリ: ${options.inputDir}`);
  console.log(`   出力ディレクトリ: ${options.outputDir}`);
  console.log(`   ウォーターマークテキスト: "${options.text}"`);
  console.log(`   位置: ${options.position}`);
  console.log(`   透明度: ${options.opacity}`);
  console.log(`   フォントサイズ: ${options.fontSize}`);
  console.log(`   文字色: ${options.color}`);
  if (options.fontFile) {
    console.log(`   フォントファイル: ${options.fontFile}`);
  }
  console.log();

  // バッチ処理実行
  const startTime = Date.now();
  
  const result = await VideoWatermarkProcessor.batchProcess(
    options.inputDir,
    options.outputDir,
    {
      text: options.text,
      position: options.position,
      opacity: options.opacity,
      fontSize: options.fontSize,
      color: options.color,
      fontFile: options.fontFile
    },
    showProgress
  );

  // 改行
  console.log('\n');

  // 結果の表示
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log('🎉 バッチ処理が完了しました!');
    console.log(`   処理時間: ${Math.round(duration / 1000)}秒`);
    console.log(`   成功: ${result.processed}件`);
    console.log(`   失敗: ${result.failed}件`);
    console.log(`   合計: ${result.processed + result.failed}件\n`);

    // 詳細結果
    if (result.results.length > 0) {
      console.log('📄 詳細結果:');
      result.results.forEach(({ filename, result: fileResult }) => {
        const status = fileResult.success ? '✅' : '❌';
        const time = fileResult.duration ? `(${Math.round(fileResult.duration / 1000)}秒)` : '';
        console.log(`   ${status} ${filename} ${time}`);
        
        if (!fileResult.success && fileResult.error) {
          console.log(`      エラー: ${fileResult.error}`);
        }
      });
    }

    if (result.failed > 0) {
      console.log(`\n⚠️  ${result.failed}件のファイルで処理に失敗しました。詳細は上記を確認してください。`);
      process.exit(1);
    }
  } else {
    console.error('❌ バッチ処理に失敗しました');
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('\n❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n⏹️  処理を中断しました');
  process.exit(0);
});

// スクリプト実行
if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ 実行エラー:', error);
    process.exit(1);
  });
}

module.exports = { parseArgs, showHelp, main };