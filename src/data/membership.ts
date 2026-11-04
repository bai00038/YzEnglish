import { useEffect, useSyncExternalStore } from "react";
import membershipCodes from "./codes.json";

export type MembershipType = "founder" | "year" | "month";

interface MembershipCode {
  code: string;
  type: MembershipType;
  expiresAt: string | null;
  disabled: boolean;
}

export interface MembershipUnlock {
  type: MembershipType;
  expiresAt: string | null;
  unlockedAt: string;
}

interface MembershipApiResponse {
  authenticated?: boolean;
  membership?: { type: MembershipType; expiresAt: string | null };
  error?: string;
}

const MEMBERSHIP_STORAGE_KEY = "yz_membership_unlock";
const MEMBERSHIP_CHANGE_EVENT = "yz-membership-change";
const MEMBERSHIP_API_URL = String(import.meta.env.VITE_MEMBERSHIP_API_URL ?? "").replace(/\/+$/, "");
const codes = membershipCodes as MembershipCode[];

export const SECURE_MEMBERSHIP_ENABLED = MEMBERSHIP_API_URL.length > 0;

export class MembershipApiError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "MembershipApiError";
  }
}

function isStoredUnlock(value: unknown): value is MembershipUnlock {
  if (!value || typeof value !== "object") return false;
  const unlock = value as MembershipUnlock;
  if (!["founder", "year", "month"].includes(unlock.type)) return false;
  if (unlock.type === "founder") return unlock.expiresAt === null;
  if (!unlock.expiresAt) return false;
  return Number.isFinite(new Date(unlock.expiresAt).getTime());
}

function readStoredUnlock(): MembershipUnlock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEMBERSHIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (isStoredUnlock(parsed)) return parsed;
    window.localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
  } catch {
    // Malformed or unavailable storage means the visitor stays locked.
  }
  return null;
}

function writeStoredUnlock(unlock: MembershipUnlock | null) {
  if (typeof window === "undefined") return;
  try {
    if (unlock) window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(unlock));
    else window.localStorage.removeItem(MEMBERSHIP_STORAGE_KEY);
    window.dispatchEvent(new Event(MEMBERSHIP_CHANGE_EVENT));
  } catch {
    // The server cookie remains authoritative even if local display state
    // cannot be cached (for example in strict private-browsing modes).
  }
}

function getMembershipSnapshot(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(MEMBERSHIP_STORAGE_KEY) ?? "";
}

function subscribeToMembership(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === MEMBERSHIP_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(MEMBERSHIP_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MEMBERSHIP_CHANGE_EVENT, onStoreChange);
  };
}

let refreshPromise: Promise<void> | null = null;
let lastRefreshAt = 0;
let heartbeatSubscribers = 0;
let heartbeatTimer: number | null = null;
const handleMembershipVisibility = () => {
  if (document.visibilityState === "visible") void refreshMembershipAccess(true);
};

function subscribeToMembershipHeartbeat() {
  if (!SECURE_MEMBERSHIP_ENABLED || typeof window === "undefined") return () => {};
  heartbeatSubscribers += 1;
  if (heartbeatSubscribers === 1) {
    heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshMembershipAccess(true);
    }, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", handleMembershipVisibility);
  }
  return () => {
    heartbeatSubscribers = Math.max(0, heartbeatSubscribers - 1);
    if (heartbeatSubscribers === 0) {
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      document.removeEventListener("visibilitychange", handleMembershipVisibility);
    }
  };
}

export async function refreshMembershipAccess(force = false): Promise<void> {
  if (!SECURE_MEMBERSHIP_ENABLED || typeof window === "undefined") return;
  if (!force && Date.now() - lastRefreshAt < 30_000) return;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${MEMBERSHIP_API_URL}/v1/membership/status`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const result = (await response.json().catch(() => ({}))) as MembershipApiResponse;
      if (!response.ok) {
        if (response.status === 401 || response.status === 409) writeStoredUnlock(null);
        return;
      }
      if (result.authenticated && result.membership) {
        writeStoredUnlock({ ...result.membership, unlockedAt: new Date().toISOString() });
      } else {
        writeStoredUnlock(null);
      }
      lastRefreshAt = Date.now();
    } catch {
      // Keep the last known display state during a temporary network issue.
      // Protected media still requires a fresh server-signed URL.
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function useMembershipAccess() {
  useSyncExternalStore(subscribeToMembership, getMembershipSnapshot, () => "");
  useEffect(() => {
    void refreshMembershipAccess();
    return subscribeToMembershipHeartbeat();
  }, []);
  const unlock = readStoredUnlock();
  const isExpired = Boolean(unlock?.expiresAt && new Date(unlock.expiresAt).getTime() <= Date.now());
  return { isUnlocked: Boolean(unlock) && !isExpired, isExpired, unlock };
}

async function hashMembershipCode(input: string): Promise<string> {
  const normalized = input.trim().toUpperCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function redeemLegacyMembershipCode(input: string): Promise<MembershipUnlock | null> {
  const normalized = input.trim().toUpperCase();
  if (!normalized) return null;
  let codeHash: string;
  try {
    codeHash = await hashMembershipCode(normalized);
  } catch {
    return null;
  }
  const match = codes.find(item => item.code.toLowerCase() === codeHash);
  if (!match || match.disabled) return null;
  if (match.type !== "founder") {
    const expiresAt = match.expiresAt ? new Date(match.expiresAt).getTime() : Number.NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  }
  const unlock: MembershipUnlock = {
    type: match.type,
    expiresAt: match.type === "founder" ? null : match.expiresAt,
    unlockedAt: new Date().toISOString(),
  };
  writeStoredUnlock(unlock);
  return unlock;
}

export async function redeemMembershipCode(input: string): Promise<MembershipUnlock | null> {
  if (!SECURE_MEMBERSHIP_ENABLED) return redeemLegacyMembershipCode(input);
  let response: Response;
  try {
    response = await fetch(`${MEMBERSHIP_API_URL}/v1/membership/redeem`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: input }),
    });
  } catch {
    throw new MembershipApiError("network_error");
  }
  const result = (await response.json().catch(() => ({}))) as MembershipApiResponse;
  if (!response.ok) {
    if (result.error === "invalid_code") return null;
    throw new MembershipApiError(result.error || "server_error");
  }
  if (!result.membership) throw new MembershipApiError("invalid_response");
  const unlock: MembershipUnlock = { ...result.membership, unlockedAt: new Date().toISOString() };
  writeStoredUnlock(unlock);
  lastRefreshAt = Date.now();
  return unlock;
}

export async function logoutMembershipDevice(): Promise<void> {
  if (!SECURE_MEMBERSHIP_ENABLED) {
    writeStoredUnlock(null);
    lastRefreshAt = 0;
    return;
  }
  let response: Response;
  try {
    response = await fetch(`${MEMBERSHIP_API_URL}/v1/membership/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new MembershipApiError("network_error");
  }
  if (!response.ok) throw new MembershipApiError("server_error");
  writeStoredUnlock(null);
  lastRefreshAt = 0;
}

function objectKeyFromUrl(value: string): string {
  const parsed = new URL(value, window.location.origin);
  return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
}

export async function requestProtectedAssetUrl(sceneId: string, currentUrl: string): Promise<string> {
  if (!SECURE_MEMBERSHIP_ENABLED) return currentUrl;
  let objectKey: string;
  try {
    objectKey = objectKeyFromUrl(currentUrl);
  } catch {
    throw new MembershipApiError("invalid_asset_url");
  }
  let response: Response;
  try {
    response = await fetch(`${MEMBERSHIP_API_URL}/v1/content/sign`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sceneId, objectKey }),
    });
  } catch {
    throw new MembershipApiError("network_error");
  }
  const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !result.url) throw new MembershipApiError(result.error || "signing_failed");
  return result.url;
}

export function membershipErrorMessage(error: unknown): string {
  const code = error instanceof MembershipApiError ? error.code : "server_error";
  return {
    device_limit_reached: "该会员码当前已有 2 台设备在线，请稍后再试",
    session_limit_reached: "该会员码当前已有 2 台设备在线，请在其他设备退出，或 15 分钟后再试",
    too_many_attempts: "尝试次数过多，请稍后再试",
    network_error: "网络暂时无法连接，请检查网络后重试",
  }[code] ?? "会员服务暂时不可用，请稍后再试";
}

export function membershipTypeLabel(type: MembershipType): string {
  return { founder: "创始会员", year: "年会员", month: "月会员" }[type];
}
