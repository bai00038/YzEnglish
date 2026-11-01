import { useEffect, useState } from "react";
import type { Scene } from "./types";

export const LEARNING_PROGRESS_PREFIX = "yz_progress_";
export const LEARNING_PROGRESS_EVENT = "yz-progress-change";

export type LearningStep = "watch" | "dialogue" | "language" | "pdf";

export interface LearningProgress {
  percent: number;
  lastStep: LearningStep;
  videoTime: number;
  updatedAt: string;
}

const DEFAULT_PROGRESS: LearningProgress = {
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

function normalizeProgress(value: unknown): LearningProgress {
  if (!value || typeof value !== "object") return DEFAULT_PROGRESS;
  const record = value as Partial<LearningProgress>;
  return {
    percent: Math.max(0, Math.min(100, Math.round(Number(record.percent) || 0))),
    lastStep: isLearningStep(record.lastStep) ? record.lastStep : "watch",
    videoTime: Math.max(0, Number(record.videoTime) || 0),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
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
  update: Partial<Omit<LearningProgress, "updatedAt">>,
): LearningProgress {
  if (!sceneId || typeof window === "undefined") return DEFAULT_PROGRESS;
  const current = readLearningProgress(sceneId);
  const next = normalizeProgress({
    ...current,
    ...update,
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
