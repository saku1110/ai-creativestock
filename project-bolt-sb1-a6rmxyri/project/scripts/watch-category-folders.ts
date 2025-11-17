import path from 'path';
import { config as loadEnv } from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import { FolderWatcher, WatcherConfig } from '../src/lib/folderWatcher';
import type { VideoCategory } from '../src/utils/categoryInference';

loadEnv();

interface CliOptions {
  root: string;
  processed: string;
  failed: string;
  watermarkPreset?: WatcherConfig['watermarkPreset'];
  watermarkImagePath?: string;
  watermarkOpacity?: number;
  noWatermark: boolean;
  deleteAfterUpload: boolean;
  categoryMap: Record<string, string>;
}

const parseArgs = (): CliOptions => {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    root: './uploads/categories',
    processed: './uploads/processed',
    failed: './uploads/failed',
    watermarkPreset: 'diagonalPattern',
    noWatermark: false,
    deleteAfterUpload: false,
    categoryMap: {}
  };

  for (const arg of args) {
    if (arg === '--no-watermark') options.noWatermark = true;
    else if (arg === '--delete-original') options.deleteAfterUpload = true;
    else if (arg.startsWith('--root=')) options.root = arg.split('=')[1];
    else if (arg.startsWith('--processed=')) options.processed = arg.split('=')[1];
    else if (arg.startsWith('--failed=')) options.failed = arg.split('=')[1];
    else if (arg.startsWith('--watermark=')) options.watermarkPreset = arg.split('=')[1] as WatcherConfig['watermarkPreset'];
    else if (arg.startsWith('--wm-image=')) options.watermarkImagePath = arg.split('=')[1];
    else if (arg.startsWith('--wm-opacity=')) options.watermarkOpacity = Number(arg.split('=')[1]);
    else if (arg.startsWith('--map=')) {
      const mappings = arg.split('=')[1].split(',');
      mappings.forEach(m => {
        const [folder, category] = m.split(':');
        if (folder && category) {
          options.categoryMap[folder.trim()] = category.trim();
        }
      });
    }
  }

  return options;
};

const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  beauty: 'beauty',
  diet: 'diet',
  business: 'business',
  lifestyle: 'lifestyle',
  romance: 'romance',
  '美容': 'beauty',
  'フィットネス': 'diet',
  'ヘアケア': 'beauty',
  'ビジネス': 'business',
  '暮らし': 'lifestyle',
  'ライフスタイル': 'lifestyle'
};

const run = async () => {
  const opts = parseArgs();

  const rootDir = path.resolve(process.cwd(), opts.root);
  const processedDir = path.resolve(process.cwd(), opts.processed);
  const failedDir = path.resolve(process.cwd(), opts.failed);

  const rawMap: Record<string, string> = {
    ...DEFAULT_CATEGORY_MAP,
    ...opts.categoryMap
  };

  const categoryMap: Record<string, VideoCategory> = {};
  for (const [folder, value] of Object.entries(rawMap)) {
    const normalizedValue = value?.toLowerCase();
    if (normalizedValue && ['beauty', 'diet', 'business', 'lifestyle', 'romance', 'pet'].includes(normalizedValue)) {
      categoryMap[folder] = normalizedValue as VideoCategory;
    }
  }

  const watcher = new FolderWatcher({
    watchFolder: rootDir,
    processedFolder: processedDir,
    failedFolder: failedDir,
    autoUpload: true,
    deleteAfterUpload: opts.deleteAfterUpload,
    addWatermark: !opts.noWatermark,
    watermarkPreset: opts.watermarkPreset ?? 'diagonalPattern',
    watermarkImagePath: opts.watermarkImagePath || process.env.WATERMARK_IMAGE_PATH,
    watermarkImageOpacity: opts.watermarkOpacity ?? (process.env.WATERMARK_IMAGE_OPACITY ? Number(process.env.WATERMARK_IMAGE_OPACITY) : undefined),
    categoryFromSubfolder: true,
    categoryFolderMap: categoryMap
  });

  let spinner: ora.Ora | null = null;

  watcher.onProgress((item) => {
    if (spinner) spinner.stop();
    spinner = ora({
      text: chalk.cyan(`Processing ${item.fileName}`),
      spinner: 'dots'
    }).start();

    if (item.metadata) {
      spinner.text = chalk.cyan(`分析中 ${item.fileName} / ${item.metadata.resolution} / ${item.metadata.duration}s`);
    }
    if (item.classification) {
      spinner.text = chalk.cyan(`分類中 ${item.fileName} → ${item.classification.category}`);
    }
  });

  watcher.onComplete((item) => {
    if (spinner) spinner.succeed(chalk.green(`アップロード完了: ${item.fileName}`));
    spinner = null;
  });

  watcher.onError((error, item) => {
    if (spinner) spinner.fail();
    spinner = null;
    console.error(chalk.red(`失敗: ${item.fileName}`), error.message);
  });

  console.log(chalk.cyan('\n▶ カテゴリフォルダ監視を開始します')); 
  console.log(chalk.cyan(`   ウォッチ対象: ${rootDir}`));
  console.log(chalk.cyan(`   処理済み保存先: ${processedDir}`));
  console.log(chalk.cyan(`   失敗ファイル保存先: ${failedDir}`));
  console.log(chalk.cyan(`   ウォーターマーク: ${opts.noWatermark ? '無効' : (opts.watermarkImagePath || opts.watermarkPreset)}`));
  console.log(chalk.cyan(`   カテゴリマッピング: ${JSON.stringify(categoryMap, null, 2)}`));

  process.on('SIGINT', async () => {
    if (spinner) spinner.stop();
    console.log(chalk.yellow('\n停止処理中...'));
    await watcher.stop();
    console.log(chalk.green('終了しました。'));
    process.exit(0);
  });

  await watcher.start();
};

run().catch((error) => {
  console.error(chalk.red('監視の起動に失敗しました:'), error);
  process.exit(1);
});
