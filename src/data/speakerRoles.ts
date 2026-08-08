import type { DialogueLine } from "./types";

// Frontend speaker-role helpers for the "Learn the Dialogue" transcript
// (see SceneDetailPage.tsx). Every role shown in the legend and per-line
// labels comes straight from a scene's own dialogue data (DialogueLine.speaker
// / speakerZh) — nothing here invents a role or special-cases "Customer" /
// "Staff". Matching two lines as "the same speaker" only normalizes for
// comparison (trim + lowercase); the original text is always what renders.
export function normalizeSpeaker(raw: string): string {
  return raw.trim().toLowerCase();
}

// EN -> ZH fallback for the rare dialogue line synced without a speakerZh.
// Mirrored from SPEAKER_ZH_MAP in google-apps-script/Code.gs — the
// project's existing role map — so an empty speakerZh still resolves to a
// real Chinese label instead of guessing from the dialogue content.
export const SPEAKER_ZH_FALLBACK: Record<string, string> = {
  you: "你",
  customer: "顾客",
  parent: "家长",
  "parent a": "Leo 家长",
  "parent b": "Ethan 家长",
  mom: "妈妈",
  mother: "妈妈",
  dad: "爸爸",
  father: "爸爸",
  staff: "工作人员",
  cashier: "收银员",
  teacher: "老师",
  clerk: "店员",
  receptionist: "前台工作人员",
  server: "服务员",
  waiter: "服务员",
  waitress: "服务员",
  dentist: "牙医",
  "dental assistant": "牙医助理",
  doctor: "医生",
  patient: "患者",
};

export interface SpeakerStyle {
  bg: string;
  color: string;
  border: string;
  /** Left-edge accent used on each dialogue row; "transparent" for the first (least emphasized) speaker. */
  accent: string;
}

// Index 0/1 are the two styles the transcript already used (white/gray,
// light green) before it only ever rendered two speakers. Index 2+ reuse
// soft, distinguishable tones already in the design system (see the
// emerald/amber/orange trio in getLevelStyle, components/badges.tsx) for
// scenes with three or more roles. Cycles if a scene somehow has more.
export const SPEAKER_STYLES: SpeakerStyle[] = [
  { bg: "white", color: "#6A6C66", border: "1px solid rgba(0,0,0,0.1)", accent: "transparent" },
  { bg: "rgba(183,242,29,0.22)", color: "#184C3A", border: "none", accent: "rgba(183,242,29,0.6)" },
  { bg: "rgba(245,158,11,0.16)", color: "#92400E", border: "none", accent: "rgba(245,158,11,0.55)" },
  { bg: "rgba(56,189,248,0.16)", color: "#075985", border: "none", accent: "rgba(56,189,248,0.55)" },
  { bg: "rgba(192,132,252,0.18)", color: "#6B21A8", border: "none", accent: "rgba(192,132,252,0.55)" },
];

export function styleForIndex(index: number): SpeakerStyle {
  return SPEAKER_STYLES[index % SPEAKER_STYLES.length];
}

export interface SceneSpeaker {
  key: string;
  en: string;
  zh: string;
  style: SpeakerStyle;
}

// Unique speakers for one scene's dialogue, in first-occurrence order, each
// assigned a stable color for the life of that scene. The legend and every
// dialogue row read from this same map, so a given role always renders
// with the same color and the same EN/ZH text.
export function buildSceneSpeakers(dialogue: DialogueLine[]): Map<string, SceneSpeaker> {
  const speakers = new Map<string, SceneSpeaker>();
  for (const line of dialogue) {
    const key = normalizeSpeaker(line.speaker);
    if (speakers.has(key)) continue;
    const zh = line.speakerZh.trim() || SPEAKER_ZH_FALLBACK[key] || "";
    speakers.set(key, {
      key,
      en: line.speaker.trim(),
      zh,
      style: styleForIndex(speakers.size),
    });
  }
  return speakers;
}
