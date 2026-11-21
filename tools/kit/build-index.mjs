import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

// The supplied v3 data is already canonical and frequency ordered.
export function buildCatalogue(source, chunks, audioIndex = {}, words = source.words ?? []) {
  const withAudio = entries => entries.map(entry => ({
    ...entry,
    audioUrl: audioIndex[entry.key]?.audioUrl ?? entry.audioUrl ?? null,
  }));
  return {
    expressions: withAudio(source.expressions),
    chunks: withAudio(chunks),
    words: withAudio(words),
    collections: source.collections,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalogue = buildCatalogue(
    read("tools/kit/catalogue-source.json"),
    read("tools/kit/chunks-source.json").chunks,
    read("src/data/kit/audio-index.json"),
    read("tools/kit/words-source.json").words,
  );
  fs.writeFileSync(path.join(root, "src/data/kit/catalogue.json"), JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`${catalogue.expressions.length} expressions, ${catalogue.chunks.length} chunks, ${catalogue.words.length} words`);
}
