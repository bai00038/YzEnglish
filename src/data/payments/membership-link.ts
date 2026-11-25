import { LEARNING_PATH } from '@/data/site-routes';
export function membershipCodeLink(code: string) {
  return `${LEARNING_PATH}#membership-code=${encodeURIComponent(code)}`;
}
export function readMembershipCodeFragment(hash: string) {
  const code = new URLSearchParams(hash.replace(/^#/, '')).get('membership-code') || '';
  return /^YZ-[A-Z0-9-]{8,80}$/.test(code) ? code : '';
}
