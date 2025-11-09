import fs from "fs";
import path from "path";

const projectRoot = path.resolve(".");
const csvPath = path.join(projectRoot, "temp", "dashboard-review-labeled.csv");
const targetRoot = path.join(projectRoot, "src", "local-content", "dashboard");
const outputPath = path.join(projectRoot, "temp", "missing-dashboard-videos.txt");

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
const missing: string[] = [];

for (const row of rows) {
  const relPath = row['rel_path']?.trim();
  if (!relPath) continue;
  const filePath = path.join(targetRoot, relPath);
  if (!fs.existsSync(filePath)) {
    missing.push(relPath);
  }
}

fs.writeFileSync(outputPath, missing.join('\n'), 'utf8');
console.log(`Missing ${missing.length} dashboard videos. List written to ${outputPath}`);
