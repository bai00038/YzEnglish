// Dev-only fixture generator (never used in production builds).
//
// Copies the canonical upload-ready manifest at tools/oss-manifest/
// manifest.json into public/dev-fixtures/, rewriting each episode's dataUrl
// to a same-origin path and downloading the scene.json files there. This
// lets `vite dev` exercise the exact same fetch + normalization code path
// as production without needing OSS CORS configured.
//
// Usage: node tools/oss-manifest/make-dev-fixture.mjs
// The dev server reads it via VITE_MANIFEST_URL in .env.development.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "public", "dev-fixtures", "scenes");
mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(root, "tools", "oss-manifest", "manifest.json"), "utf8"));

const devManifest = {
  ...manifest,
  scenes: await Promise.all(
    manifest.scenes.map(async entry => {
      const devEntry = { ...entry };
      if (entry.dataUrl) {
        const fileName = `${entry.externalId}.json`;
        const res = await fetch(entry.dataUrl);
        if (!res.ok) throw new Error(`download failed (${res.status}): ${entry.dataUrl}`);
        writeFileSync(join(outDir, fileName), await res.text());
        devEntry.dataUrl = `/dev-fixtures/scenes/${fileName}`;
        console.log(`ok  ${entry.externalId} -> dev-fixtures/scenes/${fileName}`);
      } else {
        console.log(`skip ${entry.externalId} (no dataUrl)`);
      }
      return devEntry;
    })
  ),
};

writeFileSync(
  join(root, "public", "dev-fixtures", "manifest.json"),
  JSON.stringify(devManifest, null, 2) + "\n"
);
console.log("wrote public/dev-fixtures/manifest.json");
