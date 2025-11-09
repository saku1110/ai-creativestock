import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { remoteManifest } from "../src/local-content/remote-manifest";

const TARGET_PREFIXES = process.argv.length > 2 ? process.argv.slice(2) : ["dashboard"];
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const localContentRoot = path.resolve(projectRoot, "src", "local-content");

const entries = Object.entries(remoteManifest).filter(([key]) =>
  TARGET_PREFIXES.some(prefix => key.startsWith(`${prefix}/`))
);

if (entries.length === 0) {
  console.log("No matching entries found for prefixes", TARGET_PREFIXES.join(", "));
  process.exit(0);
}

const ensureDir = async (dir: string) => {
  await fs.promises.mkdir(dir, { recursive: true });
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
  for (const [key, info] of entries) {
    const targetPath = path.join(localContentRoot, key);
    const targetDir = path.dirname(targetPath);
    await ensureDir(targetDir);

    let skip = false;
    try {
      const stat = await fs.promises.stat(targetPath);
      if (typeof info.size === "number" && stat.size === info.size) {
        skip = true;
      }
    } catch {
      // file missing, download required
    }

    if (skip) {
      console.log(`skip ${key}`);
      continue;
    }

    console.log(`downloading ${key}`);
    await downloadFile(info.url, targetPath);
  }

  console.log("Restore complete.");
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
