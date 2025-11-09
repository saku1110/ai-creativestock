import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import chalk from 'chalk';
import ora from 'ora';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

const LIMIT_BYTES = Number(process.env.LOCAL_CONTENT_MAX_BYTES ?? 2 * 1024 * 1024 * 1024); // 2 GiB
const TARGET_DIR = 'src/local-content';
const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const DRY_RUN = process.argv.includes('--dry-run') || process.env.LOCAL_CONTENT_DRY_RUN === '1';

if (!ffmpegStatic) {
  console.error(chalk.red('ffmpeg-static が見つかりません。`npm install` を実行してください。'));
  process.exit(1);
}

ffmpeg.setFfmpegPath(ffmpegStatic);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(projectRoot, TARGET_DIR);

type LargeFile = { filePath: string; size: number };

const formatSize = (bytes: number) => `${(bytes / (1024 ** 3)).toFixed(2)} GiB`;

async function pathExists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function collectLargeFiles(dir: string): Promise<LargeFile[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const results: LargeFile[] = [];

  for (const entry of dirents) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await collectLargeFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const stats = await fs.stat(entryPath);
    if (stats.size > LIMIT_BYTES) {
      results.push({ filePath: entryPath, size: stats.size });
    }
  }

  return results;
}

async function compressFile({ filePath, size }: LargeFile) {
  const backupPath = `${filePath}.original`;
  const temporaryPath = `${filePath}.tmp`;

  if (await pathExists(backupPath)) {
    console.log(chalk.yellow(`既に圧縮済みとしてスキップ: ${filePath}`));
    return;
  }

  const spinner = ora(
    `圧縮開始: ${path.relative(projectRoot, filePath)} (${formatSize(size)})`
  ).start();

  if (DRY_RUN) {
    spinner.info(`DRY-RUN: 実際の圧縮は行われません (${path.relative(projectRoot, filePath)})`);
    return;
  }

  const preset = process.env.LOCAL_CONTENT_FFMPEG_PRESET ?? 'veryfast';
  const crf = process.env.LOCAL_CONTENT_FFMPEG_CRF ?? '26';
  const audioBitrate = process.env.LOCAL_CONTENT_AUDIO_BITRATE ?? '160k';

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate(audioBitrate)
        .outputOptions([
          '-preset',
          preset,
          '-crf',
          crf,
          '-movflags',
          '+faststart'
        ])
        .on('progress', (progress) => {
          if (progress.percent !== undefined) {
            spinner.text = `圧縮中 (${progress.percent.toFixed(1)}%): ${path.relative(projectRoot, filePath)}`;
          }
        })
        .on('error', (error) => reject(error))
        .on('end', () => resolve())
        .save(temporaryPath);
    });

    await fs.rename(filePath, backupPath);
    await fs.rename(temporaryPath, filePath);

    const newStats = await fs.stat(filePath);
    spinner.succeed(
      `圧縮完了: ${path.relative(projectRoot, filePath)} ${formatSize(size)} → ${formatSize(
        newStats.size
      )}`
    );

    if (newStats.size > LIMIT_BYTES) {
      console.warn(
        chalk.yellow(
          `警告: 圧縮後も 2 GiB を超えています (${path.relative(projectRoot, filePath)}). 追加の圧縮設定を調整してください。`
        )
      );
    }
  } catch (error) {
    spinner.fail(`圧縮失敗: ${path.relative(projectRoot, filePath)} - ${(error as Error).message}`);
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function main() {
  if (!(await pathExists(contentRoot))) {
    console.log(chalk.yellow(`対象ディレクトリが見つかりませんでした: ${contentRoot}`));
    return;
  }

  const scanSpinner = ora(`${TARGET_DIR} を走査中...`).start();
  const largeFiles = await collectLargeFiles(contentRoot);
  scanSpinner.succeed(`${largeFiles.length} 件の 2GB 超ファイルを検出しました。`);

  if (largeFiles.length === 0) {
    console.log(chalk.green('圧縮対象のファイルはありません。'));
    return;
  }

  for (const file of largeFiles) {
    await compressFile(file);
  }

  console.log(
    chalk.green(
      '大容量ファイルの圧縮が完了しました。バックアップは *.original に保存されています。問題なければ手動で削除してください。'
    )
  );
}

main().catch((error) => {
  console.error(chalk.red(`圧縮処理でエラーが発生しました: ${(error as Error).message}`));
  process.exit(1);
});
