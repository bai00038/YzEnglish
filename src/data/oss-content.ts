import type {
  CultureTip,
  DialogueLine,
  Expression,
  Scene,
  SceneContent,
  TipType,
} from "./types";

// ---------------------------------------------------------------------------
// OSS content source — the static replacement for Supabase.
//
// The site is a static frontend: at runtime it fetches the episode manifest
// from OSS, then fetches each episode's scene.json on demand. Adding a new
// episode = uploading its content package to OSS + appending one entry to
// the manifest — no rebuild, no redeploy.
//
// The manifest this module reads is content/manifest.json on OSS. Its schema
// is documented by the canonical copy at tools/oss-manifest/manifest.json
// (the file that gets uploaded to OSS).
//
// Env overrides (local dev only):
//   VITE_MANIFEST_URL  — point at a local fixture, e.g. /dev-fixtures/manifest.json
//   VITE_CONTENT_BASE  — base URL prefix when VITE_MANIFEST_URL is unset
// ---------------------------------------------------------------------------

const CONTENT_BASE = import.meta.env.VITE_CONTENT_BASE ?? "https://go.learnyzenglish.com";

export const MANIFEST_URL =
  import.meta.env.VITE_MANIFEST_URL ?? `${CONTENT_BASE}/content/manifest.json`;

export interface ManifestScene {
  id: number;
  slug: string;
  titleEn: string;
  titleZh: string;
  category: string;
  region: string;
  level: string;
  duration: string;
  featured: boolean;
  isNew: boolean;
  desc: string;
  photo?: string;
  video_url?: string;
  pdfUrl?: string;
  externalId: string;
  dataUrl?: string;
}

interface ContentManifest {
  schemaVersion: number;
  updatedAt: string;
  scenes: ManifestScene[];
}

// One cached in-flight request — every hook on a page shares it.
let manifestPromise: Promise<ManifestScene[]> | null = null;

export function fetchManifestScenes(): Promise<ManifestScene[]> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      const res = await fetch(MANIFEST_URL);
      if (!res.ok) {
        throw new Error(`manifest fetch failed (${res.status}): ${MANIFEST_URL}`);
      }
      const json = (await res.json()) as ContentManifest;
      if (!json || !Array.isArray(json.scenes)) {
        throw new Error(`manifest has no scenes array: ${MANIFEST_URL}`);
      }
      return json.scenes;
    })();
    // Don't cache a rejection forever — a transient network blip in dev
    // shouldn't poison every later navigation until reload.
    manifestPromise.catch(() => {
      manifestPromise = null;
    });
  }
  return manifestPromise;
}

// List-level Scene: everything the library cards need, no per-episode
// fetch. `content` stays undefined until fetchEpisodeDetail() fills it.
export function manifestEntryToScene(entry: ManifestScene): Scene {
  return {
    id: entry.id,
    slug: entry.slug,
    titleEn: entry.titleEn,
    titleZh: entry.titleZh,
    category: entry.category,
    region: entry.region,
    level: entry.level,
    duration: entry.duration,
    featured: entry.featured,
    isNew: entry.isNew,
    desc: entry.desc,
    photo: entry.photo ?? undefined,
    pdfUrl: entry.pdfUrl ?? undefined,
    video_url: entry.video_url ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Detail normalization — two scene.json schemas exist on OSS:
//
//  1. "flat" (HC-01-002, SH-01-004, FD-01-001): already shaped like the
//     site's Scene type, with content.sceneSetup/learningGoal/dialogue/
//     expressions/vocabulary/tips. Passed through, with the manifest as
//     the authority for identity fields (id/slug/titles/category/level/
//     duration/desc/photo/pdfUrl) and the video URL — both the manifest
//     and some scene.json files still carry pre-migration video paths.
//  2. "pipeline" (FD-01-002): the new content-pipeline shape with nested
//     scene/opener/dialogue/key_expressions/canada_tip sections. Mapped
//     field-by-field below; anything the pipeline doesn't author (timings,
//     cover, PDF) degrades gracefully instead of being invented.
// ---------------------------------------------------------------------------

function normalizeTipType(raw: unknown): TipType {
  return raw === "culture_tip" ? "culture_tip" : "key_expression";
}

function normalizeTips(raw: unknown): CultureTip[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>).map(tip => ({
    type: typeof tip.type === "string" ? tip.type : "",
    tipType: normalizeTipType(tip.tipType),
    title: typeof tip.title === "string" ? tip.title : "",
    titleZh: typeof tip.titleZh === "string" ? tip.titleZh : "",
    body: typeof tip.body === "string" ? tip.body : "",
    bodyZh: typeof tip.bodyZh === "string" ? tip.bodyZh : "",
  }));
}

// Speaker label for the dialogue legend — the pipeline's raw role names
// ("Aria", "Restaurant") mapped the same way the legacy sheets did.
const SPEAKER_ZH: Record<string, string> = {
  Aria: "你",
  Restaurant: "餐厅",
};

function speakerZhFor(speaker: string): string {
  return SPEAKER_ZH[speaker] ?? speaker;
}

interface PipelineLine {
  speaker?: string;
  en?: string;
  zh?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function mapPipelineDetail(
  json: Record<string, unknown>,
  entry: ManifestScene,
  timing?: Array<{ card: number; start: number; end: number; en?: string }>
): Scene {
  const sceneMeta = (json.scene ?? {}) as Record<string, unknown>;
  const opener = (json.opener ?? {}) as Record<string, unknown>;
  const dialogue = (json.dialogue ?? {}) as Record<string, unknown>;
  const lines = (Array.isArray(dialogue.lines) ? dialogue.lines : []) as PipelineLine[];
  const keyExpressions = (Array.isArray(json.key_expressions) ? json.key_expressions : []) as Array<
    Record<string, unknown>
  >;
  const canadaTip = (json.canada_tip ?? {}) as Record<string, unknown>;

  const dialogueLines: DialogueLine[] = lines.map((l, i) => {
    // Match timing by text (not index) — the video subtitles may be a
    // shortened version of the full dialogue in scene.json. Only lines
    // with matching text get tap-to-play; others render as plain text.
    const lineEn = str(l.en);
    const t = timing?.find(entry => {
      if (typeof entry.start !== "number" || typeof entry.end !== "number") return false;
      const timingEn = typeof entry.en === "string" ? entry.en : "";
      if (!timingEn) return entry.card === i; // fallback to index if no text
      const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
      const nLine = norm(lineEn);
      const nTiming = norm(timingEn);
      return nLine === nTiming || nLine.includes(nTiming) || nTiming.includes(nLine);
    });
    return {
      speaker: str(l.speaker),
      speakerZh: speakerZhFor(str(l.speaker)),
      en: lineEn,
      zh: str(l.zh),
      // Per-line timings from the episode's timing.json (if text matches) —
      // enables tap-to-play on the detail page. Absent = plain text.
      ...(t && typeof t.start === "number" && typeof t.end === "number"
        ? { start: t.start, end: t.end }
        : {}),
    };
  });

  const expressions: Expression[] = keyExpressions.map(k => ({
    label: "",
    en: str(k.expression),
    zh: str(k.meaning_zh),
    note: str(k.explanation_en),
  }));

  // Legacy-shaped tips so the detail page's existing keyExpressions/
  // cultureTips derivation keeps working unchanged.
  const tips: CultureTip[] = [
    ...keyExpressions.map(k => ({
      type: "key_expression",
      tipType: "key_expression" as TipType,
      title: str(k.expression),
      titleZh: str(k.meaning_zh),
      body: str(k.explanation_en),
      bodyZh: "",
    })),
    ...(canadaTip && (canadaTip.title_en || canadaTip.body_zh)
      ? [
          {
            type: "canada_tip",
            tipType: "culture_tip" as TipType,
            title: str(canadaTip.title_en),
            titleZh: str(canadaTip.title_zh),
            body: str(canadaTip.example_en),
            bodyZh: str(canadaTip.body_zh),
          },
        ]
      : []),
  ];

  const learningGoals = Array.isArray(opener.learning_goals)
    ? (opener.learning_goals as unknown[]).filter((g): g is string => typeof g === "string")
    : [];

  const content: SceneContent = {
    sceneSetup: { en: str(dialogue.context_en), zh: str(dialogue.context_zh) },
    learningGoal: { en: learningGoals.join(" · "), zh: "" },
    dialogue: dialogueLines,
    expressions,
    vocabulary: [],
    tips,
  };

  return {
    ...manifestEntryToScene(entry),
    // Prefer pipeline-authored titles when the manifest left a field empty.
    titleEn: entry.titleEn || str(sceneMeta.title_en),
    titleZh: entry.titleZh || str(sceneMeta.title_zh),
    content,
  };
}

function mapFlatDetail(json: Record<string, unknown>, entry: ManifestScene): Scene {
  const rawContent = (json.content ?? {}) as Record<string, unknown>;
  const content: SceneContent = {
    sceneSetup: {
      en: str((rawContent.sceneSetup as Record<string, unknown> | undefined)?.en),
      zh: str((rawContent.sceneSetup as Record<string, unknown> | undefined)?.zh),
    },
    learningGoal: {
      en: str((rawContent.learningGoal as Record<string, unknown> | undefined)?.en),
      zh: str((rawContent.learningGoal as Record<string, unknown> | undefined)?.zh),
    },
    dialogue: (Array.isArray(rawContent.dialogue) ? rawContent.dialogue : []) as DialogueLine[],
    expressions: (Array.isArray(rawContent.expressions) ? rawContent.expressions : []) as Expression[],
    vocabulary: Array.isArray(rawContent.vocabulary) ? rawContent.vocabulary : [],
    tips: normalizeTips(rawContent.tips),
  };

  return {
    ...manifestEntryToScene(entry),
    subtitleCues: Array.isArray(json.subtitleCues) ? json.subtitleCues : undefined,
    content,
  };
}

function isPipelineSchema(json: Record<string, unknown>): boolean {
  const dialogue = json.dialogue as Record<string, unknown> | undefined;
  return (
    typeof json.scene === "object" &&
    json.scene !== null &&
    typeof dialogue === "object" &&
    dialogue !== null &&
    Array.isArray(dialogue.lines) &&
    !("content" in json)
  );
}

export async function fetchEpisodeDetail(entry: ManifestScene): Promise<Scene> {
  if (!entry.dataUrl) {
    // Episode listed without a detail file (graceful): list-level scene,
    // no content — the detail page shows its empty state, never a crash.
    return manifestEntryToScene(entry);
  }
  const res = await fetch(entry.dataUrl);
  if (!res.ok) {
    throw new Error(`scene.json fetch failed (${res.status}): ${entry.dataUrl}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  if (!isPipelineSchema(json)) {
    return mapFlatDetail(json, entry);
  }
  // Pipeline schema: try to load per-line timings from the episode's
  // timing.json (same OSS folder as scene.json). Absent = plain text,
  // never a crash.
  let timing: Array<{ card: number; start: number; end: number; en?: string }> | undefined;
  try {
    const timingUrl = entry.dataUrl.replace(/\/[^/]+$/, "/timing.json");
    const timingRes = await fetch(timingUrl);
    if (timingRes.ok) {
      const timingJson = (await timingRes.json()) as Array<{
        card: number;
        start: number;
        end: number;
        en?: string;
      }>;
      if (Array.isArray(timingJson)) {
        timing = timingJson;
      }
    }
  } catch {
    // timing.json optional — detail page renders without tap-to-play
  }
  return mapPipelineDetail(json, entry, timing);
}
