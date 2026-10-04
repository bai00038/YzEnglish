// Verifies src/data/oss-content.ts against the real dev fixtures served by
// the vite dev server. Run: node tools/oss-manifest/verify-data-layer.mjs
// (dev server must be running on :5173)
import assert from "node:assert";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

// Bundle the TS module to CJS with esbuild, stubbing import.meta.env.
const entry = `
import { fetchManifestScenes, manifestEntryToScene, fetchEpisodeDetail } from "/home/hatch/workspace/yz-english-website/src/data/oss-content.ts";
globalThis.__oss = { fetchManifestScenes, manifestEntryToScene, fetchEpisodeDetail };
`;
writeFileSync("/tmp/verify-entry.ts", entry);
execSync(
  "/home/hatch/workspace/yz-english-website/node_modules/.bin/esbuild /tmp/verify-entry.ts " +
    "--bundle --platform=node --format=cjs --outfile=/tmp/verify-bundle.cjs " +
    `--define:import.meta.env='{"VITE_MANIFEST_URL":"http://localhost:5173/dev-fixtures/manifest.json"}' ` +
    "--log-level=error",
  { stdio: "inherit" }
);
await import("/tmp/verify-bundle.cjs");
const { fetchManifestScenes, manifestEntryToScene, fetchEpisodeDetail } = globalThis.__oss;

// 1. Manifest: 4 episodes, expected order + slugs
const entries = await fetchManifestScenes();
assert.equal(entries.length, 4, "manifest should have 4 episodes");
assert.deepEqual(
  entries.map(e => e.slug),
  [
    "returning-clothes-at-a-store",
    "ordering-a-pizza-by-phone-for-pickup",
    "calling-about-a-childs-fever",
    "ordering-restaurant-delivery-by-phone",
  ],
  "slug order"
);
console.log("✓ manifest: 4 episodes, slugs ok");

// 2. List-level mapping for all
const scenes = entries.map(manifestEntryToScene);
for (const s of scenes) {
  assert.ok(s.id && s.slug && s.titleEn && s.titleZh && s.category, `list fields for ${s.slug}`);
  assert.equal(s.content, undefined, "list-level scene has no content");
}
const fd2 = scenes.find(s => s.slug === "ordering-restaurant-delivery-by-phone");
assert.equal(fd2.photo, undefined, "FD-01-002 has no photo (graceful)");
assert.equal(fd2.pdfUrl, undefined, "FD-01-002 has no pdfUrl (graceful)");
assert.ok(fd2.video_url.includes("/content/FD-01-002/FD-01-002-no-subtitles.mp4"), "FD-01-002 video url");
console.log("✓ list mapping ok (incl. FD-01-002 graceful degradation)");

// Node's fetch needs absolute URLs; the browser resolves relative dataUrls
// against the page origin, so rewrite them here for the harness only.
for (const e of entries) {
  if (e.dataUrl?.startsWith("/")) e.dataUrl = `http://localhost:5173${e.dataUrl}`;
}

// 3. Detail: flat schema episodes pass through
for (const slug of ["returning-clothes-at-a-store", "ordering-a-pizza-by-phone-for-pickup", "calling-about-a-childs-fever"]) {
  const entry = entries.find(e => e.slug === slug);
  const detail = await fetchEpisodeDetail(entry);
  assert.ok(detail.content, `${slug}: content present`);
  assert.ok(detail.content.dialogue.length > 10, `${slug}: dialogue lines`);
  assert.ok(detail.content.dialogue[0].start !== undefined, `${slug}: dialogue has timings`);
  assert.ok(detail.content.tips.length > 0, `${slug}: tips present`);
  assert.ok(detail.video_url.includes(`/content/${entry.externalId}/`), `${slug}: video_url from manifest (fixed path)`);
  console.log(`✓ detail flat ok: ${slug} (${detail.content.dialogue.length} lines, ${detail.content.tips.length} tips)`);
}

// 4. Detail: FD-01-002 pipeline schema mapping
const fd2entry = entries.find(e => e.externalId === "FD-01-002");
const fd2detail = await fetchEpisodeDetail(fd2entry);
const c = fd2detail.content;
assert.ok(c, "FD-01-002 content present");
assert.equal(c.dialogue.length, 17, "FD-01-002 dialogue lines");
assert.equal(c.dialogue[0].speaker, "Restaurant");
assert.equal(c.dialogue[0].speakerZh, "餐厅", "speakerZh mapping");
assert.equal(c.dialogue[1].speakerZh, "你", "Aria -> 你");
assert.ok(c.dialogue.every(l => l.start === undefined), "no invented timings");
assert.ok(c.sceneSetup.en.length > 0 && c.sceneSetup.zh.length > 0, "sceneSetup");
assert.ok(c.learningGoal.en.length > 0, "learningGoal.en");
const ke = c.tips.filter(t => t.tipType === "key_expression");
const ct = c.tips.filter(t => t.tipType === "culture_tip");
assert.ok(ke.length >= 5, `key_expression tips (${ke.length})`);
assert.equal(ct.length, 1, "canada_tip -> 1 culture_tip");
assert.ok(ct[0].bodyZh.length > 0, "culture tip bodyZh");
console.log(`✓ detail pipeline ok: FD-01-002 (17 lines, ${ke.length} key expr, 1 culture tip)`);

// 5. Video URLs all resolve 200 (the actual bytes the <video> tag will load)
for (const e of entries) {
  const res = await fetch(e.video_url, { method: "HEAD" });
  assert.equal(res.status, 200, `video 200: ${e.externalId}`);
}
console.log("✓ all 4 video URLs return 200");

console.log("\nALL DATA-LAYER CHECKS PASSED");
