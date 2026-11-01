import { useEffect, useState } from "react";
import type { Scene } from "./types";

export const LEARNING_PROGRESS_PREFIX = "yz_progress_";
export const LEARNING_PROGRESS_EVENT = "yz-progress-change";

export type LearningStep = "watch" | "dialogue" | "language" | "pdf";

export interface LearningProgress {
  videoPercent: number;
  sentencesDone: number;
  sentencesTotal: number;
  completedSentenceIndexes: number[];
  dictationDone: boolean;
  dictationAvailable: boolean;
  downloadedPdf: boolean;
  percent: number;
  lastStep: LearningStep;
  videoTime: number;
  updatedAt: string;
}

const DEFAULT_PROGRESS: LearningProgress = {
  videoPercent: 0,
  sentencesDone: 0,
  sentencesTotal: 0,
  completedSentenceIndexes: [],
  dictationDone: false,
  dictationAvailable: false,
  downloadedPdf: false,
  percent: 0,
  lastStep: "watch",
  videoTime: 0,
  updatedAt: "",
};

export function getSceneProgressId(scene: Pick<Scene, "id" | "externalId">): string {
  return scene.externalId || String(scene.id);
}

function isLearningStep(value: unknown): value is LearningStep {
  return value === "watch" || value === "dialogue" || value === "language" || value === "pdf";
}

function clampPercent(value: unknown): number {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function calculatePercent(progress: Pick<LearningProgress, "videoPercent" | "sentencesDone" | "sentencesTotal" | "dictationDone" | "dictationAvailable">): number {
  const videoRatio = clampPercent(progress.videoPercent) / 100;
  const sentenceRatio = progress.sentencesTotal > 0
    ? Math.min(1, progress.sentencesDone / progress.sentencesTotal)
    : 0;

  if (progress.sentencesTotal <= 0) return Math.round(videoRatio * 100);
  if (!progress.dictationAvailable) return Math.round((videoRatio * 40) + (sentenceRatio * 60));
  return Math.round((videoRatio * 30) + (sentenceRatio * 40) + (progress.dictationDone ? 30 : 0));
}

function normalizeProgress(value: unknown): LearningProgress {
  if (!value || typeof value !== "object") return DEFAULT_PROGRESS;
  const record = value as Partial<LearningProgress>;
  // Records created by the former section-based system only had percent,
  // lastStep and videoTime. Keep their resume position, but deliberately do
  // not carry the old artificial percentage into the action-based model.
  const hasActionProgress = "videoPercent" in record
    || "sentencesDone" in record
    || "dictationDone" in record;
  const completedSentenceIndexes = Array.isArray(record.completedSentenceIndexes)
    ? Array.from(new Set(record.completedSentenceIndexes
      .map(index => Math.floor(Number(index)))
      .filter(index => Number.isFinite(index) && index >= 0)))
    : [];
  const sentencesTotal = Math.max(0, Math.floor(Number(record.sentencesTotal) || 0));
  const sentencesDone = Math.min(
    sentencesTotal,
    Math.max(completedSentenceIndexes.length, Math.floor(Number(record.sentencesDone) || 0)),
  );
  const normalized: LearningProgress = {
    videoPercent: hasActionProgress ? clampPercent(record.videoPercent) : 0,
    sentencesDone: hasActionProgress ? sentencesDone : 0,
    sentencesTotal: hasActionProgress ? sentencesTotal : 0,
    completedSentenceIndexes: hasActionProgress ? completedSentenceIndexes : [],
    dictationDone: hasActionProgress && record.dictationDone === true,
    dictationAvailable: hasActionProgress && record.dictationAvailable === true,
    downloadedPdf: record.downloadedPdf === true,
    percent: 0,
    lastStep: isLearningStep(record.lastStep) ? record.lastStep : "watch",
    videoTime: Math.max(0, Number(record.videoTime) || 0),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
  const calculatedPercent = calculatePercent(normalized);
  return {
    ...normalized,
    percent: hasActionProgress
      ? Math.max(calculatedPercent, Math.round(clampPercent(record.percent)))
      : 0,
  };
}

export function readLearningProgress(sceneId: string): LearningProgress {
  if (!sceneId || typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const saved = window.localStorage.getItem(`${LEARNING_PROGRESS_PREFIX}${sceneId}`);
    return saved ? normalizeProgress(JSON.parse(saved)) : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function writeLearningProgress(
  sceneId: string,
  update: Partial<Omit<LearningProgress, "updatedAt" | "percent" | "sentencesDone">>,
): LearningProgress {
  if (!sceneId || typeof window === "undefined") return DEFAULT_PROGRESS;
  const current = readLearningProgress(sceneId);
  const completedSentenceIndexes = Array.from(new Set([
    ...current.completedSentenceIndexes,
    ...(update.completedSentenceIndexes ?? []),
  ])).sort((a, b) => a - b);
  const sentencesTotal = update.sentencesTotal === undefined
    ? current.sentencesTotal
    : Math.max(0, Math.floor(update.sentencesTotal));
  const components = {
    videoPercent: Math.max(current.videoPercent, clampPercent(update.videoPercent)),
    sentencesDone: Math.min(sentencesTotal, Math.max(current.sentencesDone, completedSentenceIndexes.length)),
    sentencesTotal,
    completedSentenceIndexes,
    dictationDone: current.dictationDone || update.dictationDone === true,
    dictationAvailable: update.dictationAvailable ?? current.dictationAvailable,
    downloadedPdf: current.downloadedPdf || update.downloadedPdf === true,
  };
  const next = normalizeProgress({
    ...current,
    ...update,
    ...components,
    percent: Math.max(current.percent, calculatePercent(components)),
    updatedAt: new Date().toISOString(),
  });
  try {
    window.localStorage.setItem(`${LEARNING_PROGRESS_PREFIX}${sceneId}`, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(LEARNING_PROGRESS_EVENT, { detail: { sceneId, progress: next } }));
  } catch {
    // Storage may be disabled. The lesson remains usable without persistence.
  }
  return next;
}

export function updateLearningPosition(
  sceneId: string,
  update: Pick<LearningProgress, "lastStep" | "videoTime">,
): LearningProgress {
  return writeLearningProgress(sceneId, update);
}

export function readAllLearningProgress(): Record<string, LearningProgress> {
  if (typeof window === "undefined") return {};
  const result: Record<string, LearningProgress> = {};
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(LEARNING_PROGRESS_PREFIX)) continue;
      const sceneId = key.slice(LEARNING_PROGRESS_PREFIX.length);
      result[sceneId] = readLearningProgress(sceneId);
    }
  } catch {
    return {};
  }
  return result;
}

function useLearningProgressVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setVersion(value => value + 1);
    window.addEventListener(LEARNING_PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LEARNING_PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return version;
}

export function useLearningProgress(sceneId: string): LearningProgress {
  useLearningProgressVersion();
  return readLearningProgress(sceneId);
}

export function useAllLearningProgress(): Record<string, LearningProgress> {
  useLearningProgressVersion();
  return readAllLearningProgress();
}

export function getCollectionLearningProgress(
  scenes: Array<Pick<Scene, "id" | "externalId">>,
  progressByScene: Record<string, LearningProgress>,
) {
  const records = scenes.map(scene => progressByScene[getSceneProgressId(scene)] ?? DEFAULT_PROGRESS);
  const completedCount = records.filter(progress => progress.percent === 100).length;
  const hasAnyProgress = records.some(progress => progress.percent > 0);
  const totalCount = scenes.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return {
    completedCount,
    hasAnyProgress,
    totalCount,
    percent,
    isComplete: totalCount > 0 && completedCount === totalCount,
  };
}
