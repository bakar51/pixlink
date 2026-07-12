/**
 * utils/shortCode.js — Generates a short, URL-safe unique code
 *
 * Uses nanoid v5 (ESM-only in v5, so we use a dynamic import wrapper).
 * The generated code is 6 characters from a URL-safe alphabet,
 * giving ~56 billion unique combinations — more than enough for this use case.
 *
 * Example output: "aB3dK9"
 */

'use strict';

/**
 * generateCode() → Promise<string>
 *
 * Returns a 6-character URL-safe random string.
 * Async because nanoid v5 is ESM-only and requires a dynamic import.
 */
async function generateCode() {
  // nanoid v5 is ESM-only; dynamic import lets us use it from CommonJS
  const { nanoid } = await import('nanoid');
  return nanoid(6); // 6 chars, default URL-safe alphabet
}

module.exports = { generateCode };
