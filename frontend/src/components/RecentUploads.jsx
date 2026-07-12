/**
 * components/RecentUploads.jsx
 *
 * Renders the "Recent uploads" section using data from localStorage.
 * This is a local-only feature — nothing is fetched from the server.
 *
 * Props:
 *  uploads  {Array}    — list of recent upload objects from localStorage
 *  onClear  {Function} — callback to clear localStorage and update parent state
 */

import { formatBytes } from '../utils/compress';

export default function RecentUploads({ uploads, onClear }) {
  if (!uploads || uploads.length === 0) return null;

  return (
    <section className="recent-section" aria-label="Recent uploads">
      <div className="recent-header">
        <h2 className="recent-title">Recent uploads</h2>
        <button
          id="clear-recent-btn"
          className="btn btn--ghost btn--sm"
          onClick={onClear}
          aria-label="Clear recent uploads list"
        >
          Clear
        </button>
      </div>

      <ul className="recent-list" aria-label="List of recently uploaded images">
        {uploads.map((item) => {
          const isExpired =
            item.expiresAt &&
            item.expiresAt !== 'never' &&
            new Date(item.expiresAt) < new Date();

          const relativeTime = item.uploadedAt
            ? timeAgo(new Date(item.uploadedAt))
            : '';

          return (
            <li key={item.code} className="recent-item">
              {/* Thumbnail — uses the direct image URL as src */}
              <img
                src={item.viewUrl}
                alt={`Thumbnail for ${item.originalName || item.code}`}
                className="recent-thumb"
                loading="lazy"
                onError={(e) => {
                  // Hide broken thumbnail gracefully
                  e.target.style.visibility = 'hidden';
                }}
              />

              <div className="recent-item__info">
                <a
                  href={item.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="recent-item__url"
                  title={item.shortUrl}
                  aria-label={`Short link for ${item.originalName || item.code}`}
                >
                  {item.shortUrl}
                </a>
                <div className="recent-item__meta">
                  {relativeTime}
                  {item.size ? ` · ${formatBytes(item.size)}` : ''}
                  {isExpired ? ' · Expired' : ''}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * timeAgo(date)
 * Returns a human-readable relative time string.
 * e.g. "just now", "3 minutes ago", "2 hours ago"
 *
 * @param {Date} date
 * @returns {string}
 */
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60)    return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes  < 60)   return `${minutes}m ago`;
  const hours   = Math.floor(minutes  / 60);
  if (hours    < 24)   return `${hours}h ago`;
  const days    = Math.floor(hours    / 24);
  return `${days}d ago`;
}
