// Includes iPadOS requesting a desktop user agent. Desktop Macs keep track controls.
export function usesIosSeekControls(platform: { userAgent: string; platform: string; maxTouchPoints: number }) {
  return /iPhone|iPad|iPod/i.test(platform.userAgent)
    || (platform.platform === 'MacIntel' && platform.maxTouchPoints > 1);
}
