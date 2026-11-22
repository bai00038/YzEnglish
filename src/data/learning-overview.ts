// Presentation selectors only: §十五's persisted records remain unchanged.
export function splitLearningScenes<T extends { id: number; externalId?: string }>(scenes: T[], progress: Record<string, { percent: number; updatedAt: string }>) {
  const records = scenes.flatMap(scene => {
    const record = progress[scene.externalId || String(scene.id)];
    return record && record.percent > 0 ? [{ scene, progress: record }] : [];
  }).sort((a, b) => b.progress.updatedAt.localeCompare(a.progress.updatedAt));
  return { continuing: records.filter(item => item.progress.percent < 100), completed: records.filter(item => item.progress.percent >= 100) };
}

export type MessageAction = { label: string; path: string };
export type SiteMessage = { id: string; type: 'announcement' | 'new-scene' | 'personal'; title: string; body: string; publishedAt: string; action?: MessageAction; href?: string };
export function isInternalMessagePath(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/|\\)/.test(value) && !/[\u0000-\u0020\u007f\\]/.test(value);
}
export function getMessageAction(message: SiteMessage): MessageAction | undefined {
  if (message.action && message.action.label.trim() && isInternalMessagePath(message.action.path)) return message.action;
  // Older announcement files used href. Keep them usable during rollout.
  if (isInternalMessagePath(message.href)) return { label: message.type === 'personal' ? '查看我的会员' : message.type === 'new-scene' ? '去看这一集' : '前往查看', path: message.href };
}
export function messageDetailHref(id: string) {
  return `/membership/messages/detail?id=${encodeURIComponent(id)}`;
}
export function isAnnouncementFile(value: unknown): value is { announcements: SiteMessage[] } {
  if (!value || typeof value !== 'object' || !('announcements' in value) || !Array.isArray(value.announcements)) return false;
  const ids = new Set<string>();
  return value.announcements.every(item => {
    if (!item || typeof item !== 'object' || !['announcement', 'new-scene'].includes(item.type) ||
      !['id', 'title', 'body', 'publishedAt'].every(key => typeof item[key] === 'string') || !item.id || !item.title ||
      !Number.isFinite(Date.parse(item.publishedAt)) || ids.has(item.id) ||
      (item.href !== undefined && !isInternalMessagePath(item.href)) ||
      (item.action !== undefined && (!item.action || typeof item.action !== 'object' || typeof item.action.label !== 'string' || !item.action.label.trim() || !isInternalMessagePath(item.action.path)))) return false;
    ids.add(item.id); return true;
  });
}
export function expiryNotice(unlock: { type: string; expiresAt: string | null; unlockedAt: string } | null, now = Date.now()): SiteMessage[] {
  if (!unlock?.expiresAt) return [];
  const expires = Date.parse(unlock.expiresAt);
  const days = Math.ceil((expires - now) / 86400000);
  if (!Number.isFinite(expires) || days > 7) return [];
  return [{ id: `expiry:${unlock.type}:${unlock.expiresAt}`, type: 'personal', title: days <= 0 ? '会员已到期' : `会员还有 ${days} 天到期`,
    body: days <= 0
      ? `你的会员已于 ${new Date(expires).toLocaleDateString('zh-CN')} 到期。\n\n可以前往「我的学习」查看会员状态或更换兑换码。`
      : `你的会员有效期至 ${new Date(expires).toLocaleDateString('zh-CN')}，目前还剩 ${days} 天。\n\n可以前往「我的学习」查看有效期，按自己的节奏继续学习。`,
    publishedAt: new Date(expires - 7 * 86400000).toISOString(), action: { label: '查看我的会员', path: '/membership' } }];
}
export function unreadMessageIds(messages: SiteMessage[], readIds: string[]) { return messages.filter(message => !readIds.includes(message.id)).map(message => message.id); }
