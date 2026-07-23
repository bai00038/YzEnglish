export interface DialogueLine {
  speaker: "You" | "Staff";
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
}
