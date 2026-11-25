export const PURCHASE_PATH = '/membership';
export const LEARNING_PATH = '/my-learning';
// Only legacy learning subpages redirect. The old root is now the purchase page.
export function legacyLearningLocation(pathname: string, search = '', hash = '') {
  return `${pathname.replace(/^\/membership(?=\/)/, LEARNING_PATH)}${search}${hash}`;
}
