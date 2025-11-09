import fs from "fs";
import path from "path";

const projectRoot = path.resolve(".");
const csvPath = path.join(projectRoot, "temp", "dashboard-review-labeled.csv");
const targetRoot = path.join(projectRoot, "src", "local-content", "dashboard");

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const parseCsv = (input: string) => {
  const lines = input.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines.shift()!);
  return lines.map(line => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? '';
    });
    return record;
  });
};

const downloadFile = async (url: string, dest: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }

  await new Promise<void>((resolve, reject) => {
    const fileStream = fs.createWriteStream(dest);
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
};

const run = async () => {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const csvRaw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvRaw);
  if (rows.length === 0) {
    console.log('No rows found in CSV.');
    return;
  }

  const thumbSample = rows.find(row => row['thumb_url']);
  if (!thumbSample) {
    console.error('Could not determine Supabase origin from CSV.');
    process.exit(1);
  }
  const origin = new URL(thumbSample['thumb_url']).origin;

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const relPath = row['rel_path']?.trim();
    if (!relPath) continue;
    const destPath = path.join(targetRoot, relPath);
    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    const encodedPath = relPath.split('/').map(encodeURIComponent).join('/');
    const videoUrl = `${origin}/storage/v1/object/public/local-content/dashboard/${encodedPath}`;
    try {
      console.log(`downloading ${relPath}`);
      await downloadFile(videoUrl, destPath);
      downloaded++;
    } catch (err) {
      failed++;
      console.error(`failed to download ${relPath}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Downloaded ${downloaded} videos. ${skipped} already existed. ${failed} failed.`);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
