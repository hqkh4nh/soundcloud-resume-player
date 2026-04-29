// `chrome.runtime.id` becomes `undefined` once the extension is reloaded, updated, or
// disabled while the page is still open — Chrome calls this an "invalidated context".
// Any subsequent `chrome.runtime.sendMessage` / `chrome.storage.*` call throws or rejects
// with "Extension context invalidated." Guard with this helper to bail out cleanly.
export function isExtensionContextValid(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined
}
