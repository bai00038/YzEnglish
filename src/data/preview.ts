// Owner-only preview mode.
//
// Opening any page with ?preview=<PREVIEW_CODE> flags this browser
// (localStorage) so that "coming" scenes behave like live ones —
// lists, search, collection rows and full detail pages — letting new
// episodes be tested on the real site before they are released.
// ?preview=off clears the flag. Everyone else only sees live scenes.
//
// This is a convenience gate, not access control: the manifest and
// episode files are public URLs by design at this stage, so treat
// the preview code like the site test code — never publish it.

const PREVIEW_CODE = "YZPV-7K9Q-4MXT";
const STORAGE_KEY = "yz-preview-mode";

let initialized = false;

function initPreviewFromUrl(): void {
  if (initialized) return;
  initialized = true;
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("preview");
    if (param === null) return;
    if (param === PREVIEW_CODE) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else if (param === "off") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      return;
    }
    url.searchParams.delete("preview");
    window.location.replace(url.toString());
  } catch {
    // Storage or URL unavailable — preview simply stays off.
  }
}

export function isPreviewEnabled(): boolean {
  initPreviewFromUrl();
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// The one visibility rule used across the site: live scenes are
// visible to everyone; coming scenes only in preview mode.
export function isSceneVisible(scene: { status?: string }): boolean {
  if (scene.status === "live") return true;
  return scene.status === "coming" && isPreviewEnabled();
}
