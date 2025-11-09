import fs from "fs";
import path from "path";

const projectRoot = path.resolve(".");
const distAssetsDir = path.join(projectRoot, "dist", "assets");
const csvPath = path.join(projectRoot, "temp", "dashboard-review-labeled.csv");
const targetRoot = path.join(projectRoot, "src", "local-content", "dashboard");

if (!fs.existsSync(distAssetsDir)) {
  console.error(`dist assets directory not found: ${distAssetsDir}`);
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

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

const buildAssetMap = () => {
  const entries = fs.readdirSync(distAssetsDir);
  const map = new Map<string, string>();
  for (const file of entries) {
    if (!file.endsWith('.mp4')) continue;
    const cleanName = file.replace(/-[a-zA-Z0-9]{8}(?=\.mp4$)/, '');
    map.set(cleanName, path.join(distAssetsDir, file));
  }
  return map;
};

const assetMap = buildAssetMap();
console.log(`Indexed ${assetMap.size} video assets from dist.`);

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvRaw);

let restored = 0;
let skipped = 0;
let missing = 0;

for (const row of rows) {
  const relPath = row['rel_path']?.trim();
  if (!relPath) {
    skipped++;
    continue;
  }
  const fileName = path.basename(relPath);
  const sourcePath = assetMap.get(fileName);
  if (!sourcePath) {
    missing++;
    console.warn(`missing dist asset for ${fileName}`);
    continue;
  }
  const destPath = path.join(targetRoot, relPath);
  const destDir = path.dirname(destPath);
  fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(destPath)) {
    const srcSize = fs.statSync(sourcePath).size;
    const destSize = fs.statSync(destPath).size;
    if (srcSize === destSize) {
      skipped++;
      continue;
    }
  }

  fs.copyFileSync(sourcePath, destPath);
  restored++;
}

console.log(`Restored ${restored} videos. ${skipped} already present, ${missing} missing from dist.`);
if (missing > 0) {
  console.warn('Some assets could not be restored because matching dist files were not found.');
}

