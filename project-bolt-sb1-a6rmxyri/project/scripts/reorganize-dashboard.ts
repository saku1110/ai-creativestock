import fs from "fs";
import path from "path";

const projectRoot = path.resolve(".");
const csvPath = path.join(projectRoot, "temp", "dashboard-review-labeled.csv");
const dashboardRoot = path.join(projectRoot, "src", "local-content", "dashboard");
const missingReport = path.join(projectRoot, "temp", "missing-dashboard-reorg.txt");

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

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvRaw);

let moved = 0;
let skipped = 0;
const missing: string[] = [];

for (const row of rows) {
  const rel = row['rel_path']?.trim();
  const fileName = rel ? path.basename(rel) : row['file'] ? path.basename(row['file']) : '';
  const category = (row['final_category'] || row['suggest_category'] || (rel ? rel.split('/')[0] : '')).trim();
  if (!category || !fileName) {
    skipped++;
    continue;
  }

  const age = row['final_age']?.trim() || '';
  const gender = row['final_gender']?.trim() || '';

  const destParts = [category];
  if (age) destParts.push(age);
  if (gender) destParts.push(gender);
  const destRel = path.join(...destParts, fileName);
  const destPath = path.join(dashboardRoot, destRel);
  const destDir = path.dirname(destPath);

  if (fs.existsSync(destPath)) {
    skipped++;
    continue;
  }

  const candidates = new Set<string>();
  if (rel) candidates.add(path.join(dashboardRoot, rel));
  candidates.add(path.join(dashboardRoot, category, fileName));
  if (row['suggest_category']) {
    candidates.add(path.join(dashboardRoot, row['suggest_category'].trim(), fileName));
  }
  candidates.add(path.join(dashboardRoot, fileName));

  let srcPath: string | undefined;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      srcPath = candidate;
      break;
    }
  }

  if (!srcPath) {
    missing.push(destRel);
    continue;
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.renameSync(srcPath, destPath);
  moved++;
}

fs.writeFileSync(missingReport, missing.join('\n'), 'utf8');
console.log(`Moved ${moved} files, skipped ${skipped}. Missing ${missing.length} files (see ${missingReport}).`);
