// Presentation selectors only: §十五's persisted records remain unchanged.
export function splitLearningScenes<T extends { id: number; externalId?: string }>(scenes: T[], progress: Record<string, { percent: number; updatedAt: string }>) {
  const records = scenes.flatMap(scene => {
    const record = progress[scene.externalId || String(scene.id)];
    return record && record.percent > 0 ? [{ scene, progress: record }] : [];
  }).sort((a, b) => b.progress.updatedAt.localeCompare(a.progress.updatedAt));
  return { continuing: records.filter(item => item.progress.percent < 100), completed: records.filter(item => item.progress.percent >= 100) };
}

export type SiteMessage = { id: string; type: 'announcement' | 'new-scene' | 'personal'; title: string; body: string; publishedAt: string; href?: string };
export function isAnnouncementFile(value: unknown): value is { announcements: SiteMessage[] } {
  if (!value || typeof value !== 'object' || !('announcements' in value) || !Array.isArray(value.announcements)) return false;
  const ids = new Set<string>();
  return value.announcements.every(item => {
    if (!item || typeof item !== 'object' || !['announcement', 'new-scene'].includes(item.type) ||
      !['id', 'title', 'body', 'publishedAt'].every(key => typeof item[key] === 'string') || !item.id || !item.title ||
      !Number.isFinite(Date.parse(item.publishedAt)) || ids.has(item.id) ||
      (item.href !== undefined && (typeof item.href !== 'string' || !/^\/(?!\/|\\)/.test(item.href) || /[\\\s]/.test(item.href)))) return false;
    ids.add(item.id); return true;
  });
}
export function expiryNotice(unlock: { type: string; expiresAt: string | null; unlockedAt: string } | null, now = Date.now()): SiteMessage[] {
  if (!unlock?.expiresAt) return [];
  const expires = Date.parse(unlock.expiresAt);
  const days = Math.ceil((expires - now) / 86400000);
  if (!Number.isFinite(expires) || days > 7) return [];
  return [{ id: `expiry:${unlock.type}:${unlock.expiresAt}`, type: 'personal', title: days <= 0 ? '会员已到期' : `会员还有 ${days} 天到期`,
    body: days <= 0 ? '可以在我的学习查看会员状态或更换兑换码。' : '可以在我的学习查看有效期，继续安排学习。', publishedAt: new Date(expires - 7 * 86400000).toISOString(), href: '/membership' }];
}
export function unreadMessageIds(messages: SiteMessage[], readIds: string[]) { return messages.filter(message => !readIds.includes(message.id)).map(message => message.id); }
