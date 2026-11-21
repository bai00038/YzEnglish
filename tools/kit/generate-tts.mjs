import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { normalizeText } from "./normalize.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const VOICE = "Kore";
const VOICE_ID = "Kore";
const STYLE = "Podcast";
const MODEL = "gemini-3.8-flash-tts";
const bucket = "yz-english-videos";
const baseUrl = "https://go.learnyzenglish.com";
const indexPath = path.join(root, "src/data/kit/audio-index.json");
const cache = path.join(root, "tools/kit/.tts-cache/kore-podcast-lufs16-v1");
const config = { voice: VOICE, voiceId: VOICE_ID, style: STYLE, model: MODEL, loudness: { integrated: -16, truePeak: -1.5 } };
const fingerprint = JSON.stringify(config);
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const upload = args.includes("--upload");
const limitArg = args.indexOf("--limit");
const limit = limitArg === -1 ? Infinity : Number(args[limitArg + 1]);
if (!(limit > 0)) throw new Error("--limit must be positive");

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}
function writeJson(file, value) {
  fs.writeFileSync(file + ".tmp", JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(file + ".tmp", file);
}
const targetScope = args.includes("--scenepage") ? "scenepage" : args.includes("--words") ? "words" : args.includes("--kit") ? "kit" : "all";
const targets = [
  ...(["all", "kit"].includes(targetScope) ? read("tools/kit/tts-targets.json") : []),
  ...(["all", "scenepage"].includes(targetScope) ? read("tools/kit/tts-scenepage-targets.json") : []),
  ...(targetScope !== "scenepage" ? read("tools/kit/tts-words-targets.json") : []),
];
const texts = new Map();
for (const target of targets) {
  const text = target.spokenText;
  const key = target.normalizedKey ?? normalizeText(target.text ?? text);
  const hash = crypto.createHash("sha256").update(key).digest("hex") + ".mp3";
  if (target.file !== hash) throw new Error(`Target hash does not match its normalized key: ${target.file}`);
  if (!texts.has(key)) texts.set(key, text);
}
const audioIndex = read("src/data/kit/audio-index.json");
console.log(`${targetScope}: ${texts.size} unique texts · ${VOICE} · ${STYLE} · ${[...texts.keys()].filter(key => audioIndex[key]?.audioUrl).length} already uploaded`);
if (dryRun) process.exit(0);

const envPath = path.join(root, ".env.tts.local");
const envLine = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8").split(/\r?\n/).find(line => line.startsWith("GEMINI_API_KEY="))
  : undefined;
const apiKey = process.env.GEMINI_API_KEY || envLine?.slice("GEMINI_API_KEY=".length).trim();
if (!apiKey) throw new Error("Set GEMINI_API_KEY in .env.tts.local");
if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status !== 0) throw new Error("ffmpeg is required");
fs.mkdirSync(cache, { recursive: true });
const configPath = path.join(cache, "config.json");
if (fs.existsSync(configPath) && JSON.stringify(JSON.parse(fs.readFileSync(configPath, "utf8"))) !== fingerprint) {
  throw new Error("Cache configuration differs; use a new cache directory.");
}
writeJson(configPath, config);

let nextSpeechRequestAt = 0;
async function api(url, options = {}) {
  if (options.method === "POST") {
    const reservedAt = Math.max(Date.now(), nextSpeechRequestAt);
    nextSpeechRequestAt = reservedAt + 8000;
    const delay = reservedAt - Date.now();
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
  }
  const response = await fetch(url, {
    ...options,
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    // Do not print server responses, credentials, or request headers.
    const details = await response.json().catch(() => ({}));
    const diagnostic = String(details.error?.message ?? "").split(apiKey).join("[redacted]");
    console.error(`Gemini HTTP ${response.status}: ${diagnostic.slice(0, 700)}`);
    const quotas = (details.error?.details ?? []).flatMap(detail => detail.violations ?? [])
      .map(violation => violation.quotaId ?? violation.quotaMetric).filter(Boolean);
    const retry = (details.error?.details ?? []).find(detail => detail.retryDelay)?.retryDelay;
    const error = new Error(`Gemini request failed (HTTP ${response.status})${quotas.length ? " · " + quotas.join(", ") : ""}`);
    error.retrySeconds = Math.min(60, Math.max(10, Number.parseFloat(retry ?? "30")));
    error.retryable = response.status >= 500 || (response.status === 429 && !/per day|daily|free tier.*day/i.test(diagnostic) && !quotas.some(quota => /perday|daily/i.test(quota)));
    throw error;
  }
  return response.json();
}
// Rebuild every current target, regardless of the old voice's audioUrl.
// A separate cache makes interrupted runs resumable without reusing old audio.
const pending = [...texts].slice(0, limit);
if (upload && pending.length !== texts.size) throw new Error("Partial voice replacement is forbidden; omit --limit when publishing.");
let completed = 0;
let cursor = 0;
async function processText(key, text) {
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const file = path.join(cache, hash + ".mp3");
  if (!fs.existsSync(file)) {
    let result;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        result = await api(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: "POST",
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Read in a Podcast style. Speak only the following English text, without any introduction or commentary:\n${text}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_ID } } },
            },
          }),
        });
        break;
      } catch (error) {
        if (!(error.retryable || error.name === "TimeoutError" || error.name === "TypeError") || attempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (error.retrySeconds ?? 10 * 2 ** attempt)));
      }
    }
    const audio = (result.candidates ?? []).flatMap(candidate => candidate.content?.parts ?? [])
      .find(part => part.inlineData?.data)?.inlineData;
    if (!audio?.data) throw new Error("Gemini returned no audio");
    const input = Buffer.from(audio.data, "base64");
    const raw = file + ".source.wav";
    fs.writeFileSync(raw, input);
    // Two-pass normalization preserves the requested loudness for short phrases.
    const measured = spawnSync("ffmpeg", ["-hide_banner", "-i", raw,
      "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
    const match = measured.stderr?.match(/\{[^{}]*"input_i"[^{}]*\}/s);
    if (measured.status !== 0 || !match) throw new Error("Loudness measurement failed");
    const m = JSON.parse(match[0]);
    if (![m.input_i, m.input_tp, m.input_lra, m.input_thresh, m.target_offset].every(v => Number.isFinite(Number(v)))) {
      throw new Error("Audio is silent or cannot be normalized");
    }
    const filter = `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    const temp = file + ".tmp.mp3";
    const converted = spawnSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-af", filter,
      "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "96k", temp,
    ], { stdio: ["ignore", "ignore", "pipe"] });
    if (converted.status !== 0) throw new Error("Normalized MP3 encoding failed");
    fs.renameSync(temp, file);
    fs.unlinkSync(raw);
  }
  completed++;
  if (completed % 10 === 0 || completed === pending.length) console.log(`${completed}/${pending.length} processed`);
}
let failure;
async function worker() {
  while (cursor < pending.length && !failure) {
    const [key, text] = pending[cursor++];
    try {
      const cached = fs.existsSync(path.join(cache, crypto.createHash("sha256").update(key).digest("hex") + ".mp3"));
      await processText(key, text);
      if (!cached) await new Promise(resolve => setTimeout(resolve, 6500));
    } catch (error) { failure = error; }
  }
}
await Promise.all([worker(), worker(), worker()]);
if (failure) {
  console.error(`Stopped with ${completed}/${pending.length} processed. New voice cache is preserved; OSS and audio indexes are unchanged.`);
  throw failure;
}
// Generation and publication are separate phases. Never publish a partial batch.
if (upload) {
  for (const [key] of texts) {
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    if (!fs.existsSync(path.join(cache, hash + ".mp3"))) throw new Error("Batch incomplete; nothing uploaded");
  }
  for (const [key] of texts) {
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const sent = spawnSync("ossutil", ["cp", path.join(cache, hash + ".mp3"), `oss://${bucket}/content/tts/${hash}.mp3`,
      "--force", "--meta", "Content-Type:audio/mpeg#Cache-Control:no-cache"], { stdio: ["ignore", "pipe", "pipe"], timeout: 60000 });
    if (sent.status !== 0) throw new Error("OSS publication interrupted. Resume the same command to finish the complete batch.");
    audioIndex[key] = { audioUrl: `${baseUrl}/content/tts/${hash}.mp3`, ...config };
  }
  writeJson(indexPath, audioIndex);
  const built = spawnSync(process.execPath, [path.join(root, "tools/kit/build-index.mjs")], { stdio: "inherit" });
  if (built.status !== 0) throw new Error("Catalogue audioUrl update failed");
  console.log("Complete batch uploaded; local audio index and catalogue updated. Publish audio-index.json after QA.");
} else console.log("Complete requested audio set cached locally; OSS and audio indexes unchanged. QA before --upload.");
