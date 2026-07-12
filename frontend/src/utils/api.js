/**
 * utils/api.js — Centralized API base URL for PixLink
 *
 * In development:  Vite proxy forwards /api/* → localhost:3000
 *                  so we use a relative path '' (empty).
 *
 * In production:   VITE_API_BASE is set to http://13.60.220.175/api
 *                  in the .env file baked into the build.
 *
 * Usage:
 *   import { apiUrl } from '../utils/api';
 *   fetch(apiUrl('/upload'))   →  /api/upload  (dev)
 *                              →  http://13.60.220.175/api/upload  (prod)
 */

const base = import.meta.env.VITE_API_BASE ?? '';

/**
 * Build a full API URL.
 * @param {string} path - must start with '/', e.g. '/upload', '/view/abc123'
 */
export function apiUrl(path) {
  if (base) {
    // Production: absolute URL  →  http://13.60.220.175/api/upload
    return `${base}${path}`;
  }
  // Development: relative URL  →  /api/upload  (proxied by Vite)
  return `/api${path}`;
}
