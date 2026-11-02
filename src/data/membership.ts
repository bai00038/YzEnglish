import { useSyncExternalStore } from "react";
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

const MEMBERSHIP_STORAGE_KEY = "yz_membership_unlock";
const MEMBERSHIP_CHANGE_EVENT = "yz-membership-change";
const codes = membershipCodes as MembershipCode[];

function isStoredUnlock(value: unknown): value is MembershipUnlock {
  if (!value || typeof value !== "object") return false;
  const unlock = value as MembershipUnlock;
  if (!["founder", "year", "month"].includes(unlock.type)) return false;
  if (unlock.type === "founder") return unlock.expiresAt === null;
  if (!unlock.expiresAt) return false;
  const expiresAt = new Date(unlock.expiresAt).getTime();
  return Number.isFinite(expiresAt);
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

export function useMembershipAccess() {
  useSyncExternalStore(subscribeToMembership, getMembershipSnapshot, () => "");
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

export async function redeemMembershipCode(input: string): Promise<MembershipUnlock | null> {
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
  try {
    window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, JSON.stringify(unlock));
    window.dispatchEvent(new Event(MEMBERSHIP_CHANGE_EVENT));
    return unlock;
  } catch {
    return null;
  }
}

export function membershipTypeLabel(type: MembershipType): string {
  return { founder: "创始会员", year: "年会员", month: "月会员" }[type];
}
