/**
 * utils/storage.js — Recent uploads localStorage CRUD
 *
 * Stores a small list of the user's recent uploads in localStorage.
 * This is purely local (not synced or shared) and lets users quickly
 * find links they created in the current browser session.
 *
 * Schema of each stored entry:
 * {
 *   code:       string,   // short-code, also used as unique ID
 *   shortUrl:   string,
 *   viewUrl:    string,   // direct image URL (for thumbnail)
 *   originalName: string,
 *   uploadedAt: string,   // ISO-8601
 *   expiresAt:  string,   // ISO-8601 or "never"
 * }
 */

const STORAGE_KEY = 'pixlink_recent';
const MAX_ENTRIES = 20; // cap to avoid unbounded localStorage growth

/**
 * getRecent()
 * Returns the stored list of recent uploads (newest first).
 *
 * @returns {Array<Object>}
 */
export function getRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    // localStorage unavailable (private mode, quota exceeded, etc.)
    return [];
  }
}

/**
 * addRecent(entry)
 * Prepends a new entry to the recent list.
 * Removes any previous entry with the same code to avoid duplicates.
 * Trims the list to MAX_ENTRIES.
 *
 * @param {Object} entry
 */
export function addRecent(entry) {
  try {
    const existing = getRecent().filter((e) => e.code !== entry.code);
    const updated  = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently ignore storage errors — this feature is non-critical
  }
}

/**
 * clearRecent()
 * Removes all stored recent uploads.
 */
export function clearRecent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
