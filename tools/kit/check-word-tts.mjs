import fs from 'node:fs';
import { normalizeText } from './normalize.mjs';

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url)));
const words = read('./words-source.json').words;
let index = read('../../src/data/kit/audio-index.json');
if (process.argv.includes('--remote')) {
  const response = await fetch('https://go.learnyzenglish.com/content/kit/audio-index.json', {
    headers: { Referer: 'https://learnyzenglish.com/' }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Audio index HTTP ${response.status}`);
  index = await response.json();
}
const missing = words.filter(word => !(index[word.key ?? normalizeText(word.text)]?.audioUrl ?? word.audioUrl));
console.log(`词汇 TTS：${words.length - missing.length}/${words.length} 已有 OSS 音频地址，缺少 ${missing.length} 条。`);
console.log(missing.length ? '上线条件未满足；本地页面仍可预览。' : '词汇 TTS 上线条件已满足。');
process.exitCode = missing.length ? 1 : 0;
