import type { MembershipUnlock } from "../../data/membership";

export const MEMBERSHIP_CODE_STORAGE_KEY = "yz_membership_display_code";
export const MEMBERSHIP_CODE_CHANGE_EVENT = "yz-membership-display-code-change";

// This display-only copy never determines membership access.
export function saveMembershipDisplayCode(code: string, membership: MembershipUnlock, storage: Pick<Storage, "setItem">) {
  storage.setItem(MEMBERSHIP_CODE_STORAGE_KEY, JSON.stringify({
    code: code.replace(/\s+/g, "").toUpperCase(),
    type: membership.type,
    expiresAt: membership.expiresAt,
  }));
}

export function readMembershipDisplayCode(raw: string, membership: MembershipUnlock): string {
  try {
    const saved = JSON.parse(raw);
    return saved?.type === membership.type && saved.expiresAt === membership.expiresAt && typeof saved.code === "string" ? saved.code : "";
  } catch { return ""; }
}

export function maskMembershipDisplayCode(code: string): string {
  const prefix = code.match(/^YZ-(?:TEST|TRIAL|FOUNDER|YEAR|MONTH|Y|M|F)(?=-|$)/)?.[0]
    ?? (code.startsWith("YZ-") ? "YZ" : "");
  return `${prefix ? prefix + "-" : ""}******`;
}
