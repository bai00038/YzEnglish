export interface DialogueLine {
  // Raw role name as authored on the sheet (e.g. "Teacher", "Dentist",
  // "Parent A") — not a fixed enum. See src/data/speakerRoles.ts for how
  // the UI derives a legend and per-line labels from whatever roles a
  // scene's dialogue actually contains.
  speaker: string;
  speakerZh: string;
  en: string;
  zh: string;
}

export interface Expression {
  label: string;
  en: string;
  zh: string;
  note: string;
}

export interface VocabularyEntry {
  word: string;
  phonetic: string;
  pos: string;
  zh: string;
  example: string;
}

export interface CultureTip {
  type: string;
  title: string;
  titleZh: string;
  body: string;
  bodyZh: string;
}

export interface BilingualText {
  en: string;
  zh: string;
}

// One WebVTT-ready subtitle line, timed against the scene video (seconds
// from video start). Synced from the "Dialogue_Lines" Google Sheet tab —
// independent of SceneContent.dialogue, which has no per-line timing.
export interface SubtitleCue {
  start: number;
  end: number;
  en: string;
  zh: string;
}

export interface SceneContent {
  sceneSetup: BilingualText;
  learningGoal: BilingualText;
  dialogue: DialogueLine[];
  expressions: Expression[];
  vocabulary: VocabularyEntry[];
  tips: CultureTip[];
  relatedSceneIds?: number[];
  prevSceneId?: number;
  nextSceneId?: number;
}

export interface Scene {
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
  pdfUrl?: string;
  video_url?: string | null;
  subtitleCues?: SubtitleCue[] | null;
  content?: SceneContent;
}

export interface PdfResource {
  id: number;
  title: string;
  titleZh: string;
  type: string;
  desc: string;
  scenes: number;
  free: boolean;
  category: string;
  filePath?: string;
}
