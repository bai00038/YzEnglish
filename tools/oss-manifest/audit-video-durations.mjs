#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const manifestPath = new URL("./manifest.json", import.meta.url);
const shouldWrite = process.argv.includes("--write");

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

async function probeDuration(scene) {
  if (!scene.video_url) throw new Error(`${scene.externalId}: missing video_url`);
  const { stdout } = await execFileAsync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", scene.video_url],
    { timeout: 90_000, maxBuffer: 1024 * 1024 },
  );
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error(`${scene.externalId}: invalid ffprobe duration ${JSON.stringify(stdout.trim())}`);
  return { scene, actual: formatDuration(seconds), seconds };
}

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (!Array.isArray(manifest.scenes)) throw new Error("manifest.scenes is missing");

const probed = await mapWithConcurrency(manifest.scenes, 4, probeDuration);
const differences = probed
  .filter(({ scene, actual }) => scene.duration !== actual)
  .map(({ scene, actual, seconds }) => ({
    externalId: scene.externalId,
    before: scene.duration,
    after: actual,
    seconds: Number(seconds.toFixed(3)),
  }));

if (shouldWrite && differences.length > 0) {
  const actualById = new Map(probed.map(({ scene, actual }) => [scene.externalId, actual]));
  for (const scene of manifest.scenes) scene.duration = actualById.get(scene.externalId) ?? scene.duration;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Checked ${probed.length} videos; ${differences.length} duration difference(s).`);
console.log("externalId\tmanifest\tactual\tseconds");
for (const item of differences) {
  console.log(`${item.externalId}\t${item.before}\t${item.after}\t${item.seconds}`);
}
if (shouldWrite) console.log(`Updated ${differences.length} duration field(s) in tools/oss-manifest/manifest.json.`);
