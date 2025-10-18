#!/usr/bin/env node

import { FolderWatcher } from '../src/lib/folderWatcher.js';
import { config } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM対応
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数を読み込み
config();

// ロゴとヘッダー
console.log(chalk.cyan('\n╔══════════════════════════════════════════╗'));
console.log(chalk.cyan('║    AI Creative Stock Auto Upload System   ║'));
console.log(chalk.cyan('╚══════════════════════════════════════════╝\n'));

// コマンドライン引数からウォーターマーク設定を取得
const args = process.argv.slice(2);
const watermarkPreset = args.find(arg => arg.startsWith('--watermark='))?.split('=')[1] || 'diagonalPattern';
const disableWatermark = args.includes('--no-watermark');
const wmImageArg = args.find(arg => arg.startsWith('--wm-image='))?.split('=')[1] || process.env.WATERMARK_IMAGE_PATH;
const wmOpacityArg = (() => {
  const v = args.find(arg => arg.startsWith('--wm-opacity='))?.split('=')[1];
  if (!v) return process.env.WATERMARK_IMAGE_OPACITY;
  const n = parseFloat(v);
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return undefined;
})();

// 設定
const watcherConfig = {
  watchFolder: path.join(process.cwd(), 'uploads', 'watch'),
  processedFolder: path.join(process.cwd(), 'uploads', 'processed'),
  failedFolder: path.join(process.cwd(), 'uploads', 'failed'),
  autoUpload: true,
  deleteAfterUpload: false,
  addWatermark: !disableWatermark,
  watermarkPreset: watermarkPreset,
  watermarkImagePath: wmImageArg,
  watermarkImageOpacity: wmOpacityArg ? Number(wmOpacityArg) : undefined
};

// ウォーターマーク設定を表示
if (!disableWatermark) {
  if (wmImageArg) {
    console.log(chalk.magenta(`🎨 Image Watermark: ${chalk.bold(wmImageArg)} (opacity=${wmOpacityArg ?? 0.85})`));
  } else {
    console.log(chalk.magenta(`🎨 Watermark: ${chalk.bold(watermarkPreset)} pattern enabled`));
  }
} else {
  console.log(chalk.yellow(`⚠️  Watermark: Disabled`));
}

// フォルダ監視インスタンスを作成
const watcher = new FolderWatcher(watcherConfig);

// プログレススピナー
let spinner = null;

// イベントハンドラを設定
watcher.onProgress((item) => {
  if (spinner) spinner.stop();
  
  const statusEmoji = {
    pending: '⏳',
    processing: '🔄',
    completed: '✅',
    failed: '❌'
  };

  const statusText = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed'
  };

  const emoji = statusEmoji[item.status] || '❓';
  const status = statusText[item.status] || 'Unknown';

  if (item.status === 'processing') {
    spinner = ora({
      text: `Processing ${chalk.yellow(item.fileName)}`,
      spinner: 'dots'
    }).start();

    if (item.metadata) {
      spinner.text = `Analyzing ${chalk.yellow(item.fileName)} - Duration: ${item.metadata.duration}s, Resolution: ${item.metadata.resolution}`;
    }

    if (item.classification) {
      spinner.text = `Categorizing ${chalk.yellow(item.fileName)} - Category: ${chalk.green(item.classification.category)} (${(item.classification.confidence * 100).toFixed(1)}%)`;
    }
  } else {
    console.log(`${emoji} ${chalk.bold(item.fileName)} - ${chalk.cyan(status)}`);
    
    if (item.status === 'completed' && item.classification) {
      console.log(chalk.gray(`  └─ Category: ${item.classification.category}`));
      console.log(chalk.gray(`  └─ Confidence: ${(item.classification.confidence * 100).toFixed(1)}%`));
      if (item.metadata) {
        console.log(chalk.gray(`  └─ Resolution: ${item.metadata.resolution}`));
        console.log(chalk.gray(`  └─ Duration: ${item.metadata.duration}s`));
      }
    }
  }
});

watcher.onError((error, item) => {
  if (spinner) spinner.stop();
  console.error(chalk.red(`❌ Error processing ${item.fileName}:`), error.message);
});

watcher.onComplete((item) => {
  if (spinner) spinner.stop();
  console.log(chalk.green(`✅ Successfully uploaded ${chalk.bold(item.fileName)}`));
  
  // 統計を表示
  const queue = watcher.getQueueStatus();
  const pending = queue.filter(i => i.status === 'pending').length;
  const processing = queue.filter(i => i.status === 'processing').length;
  
  if (pending > 0 || processing > 0) {
    console.log(chalk.gray(`   Queue status: ${pending} pending, ${processing} processing`));
  }
});

// 監視を開始
async function start() {
  console.log(chalk.blue('📁 Watch folder:'), watcherConfig.watchFolder);
  console.log(chalk.green('✅ Processed folder:'), watcherConfig.processedFolder);
  console.log(chalk.red('❌ Failed folder:'), watcherConfig.failedFolder);
  console.log(chalk.yellow('\n👀 Watching for new MP4 files...\n'));
  
  try {
    await watcher.start();
    
    // 統計情報を定期的に表示
    setInterval(() => {
      const queue = watcher.getQueueStatus();
      if (queue.length > 0) {
        const stats = {
          pending: queue.filter(i => i.status === 'pending').length,
          processing: queue.filter(i => i.status === 'processing').length,
          completed: queue.filter(i => i.status === 'completed').length,
          failed: queue.filter(i => i.status === 'failed').length
        };
        
        if (!spinner || !spinner.isSpinning) {
          console.log(chalk.dim(`\n📊 Queue Stats - Pending: ${stats.pending}, Processing: ${stats.processing}, Completed: ${stats.completed}, Failed: ${stats.failed}`));
        }
      }
    }, 30000); // 30秒ごと

  } catch (error) {
    console.error(chalk.red('Failed to start watcher:'), error);
    process.exit(1);
  }
}

// シャットダウンハンドラ
process.on('SIGINT', async () => {
  if (spinner) spinner.stop();
  console.log(chalk.yellow('\n\n🛑 Shutting down...'));
  await watcher.stop();
  console.log(chalk.green('👋 Goodbye!\n'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (spinner) spinner.stop();
  await watcher.stop();
  process.exit(0);
});

// エラーハンドラ
process.on('uncaughtException', (error) => {
  if (spinner) spinner.stop();
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (spinner) spinner.stop();
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// 起動
start();
