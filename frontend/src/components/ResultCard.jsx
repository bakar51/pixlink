/**
 * components/ResultCard.jsx
 *
 * Shown after a successful upload.
 * Displays:
 *  - The short URL in a monospace URL row with a copy button
 *  - A QR code (canvas) for the short URL
 *  - Upload stats: original filename, size, upload time, expiry
 *  - A "Upload another" button to reset the app
 *
 * The card animates in via the card-morph-in CSS keyframe.
 *
 * Props:
 *  result     {Object}   — API response: { code, shortUrl, viewUrl, originalName, size, uploadedAt, expiresAt }
 *  onReset    {Function} — called when user clicks "Upload another"
 */

import { useEffect, useRef, useState } from 'react';
import { drawQRCode } from '../utils/qr';
import { formatBytes } from '../utils/compress';

export default function ResultCard({ result, onReset }) {
  const canvasRef  = useRef(null);
  const [copied, setCopied] = useState(false);

  // Draw QR code onto the canvas whenever the result changes
  useEffect(() => {
    if (canvasRef.current && result?.shortUrl) {
      drawQRCode(canvasRef.current, result.shortUrl).catch(console.error);
    }
  }, [result?.shortUrl]);

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.shortUrl);
    } catch {
      // Fallback for older browsers / HTTP contexts
      const ta = document.createElement('textarea');
      ta.value = result.shortUrl;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    setCopied(true);
    // Reset button after 1.5 s
    setTimeout(() => setCopied(false), 1500);
  };

  // ── Format expiry for display ──────────────────────────────────────────────
  const formatExpiry = (expiresAt) => {
    if (!expiresAt || expiresAt === 'never') return 'Never';
    const d = new Date(expiresAt);
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  };

  const uploadDate = result.uploadedAt
    ? new Date(result.uploadedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div className="result-card" id="result-card" role="region" aria-label="Upload result">
      {/* Header */}
      <div className="result-card__header">
        <div className="result-card__icon" aria-hidden="true">
          {/* Checkmark */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
               strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <div className="result-card__title">Link ready</div>
          <div className="result-card__sub text-muted">
            {result.originalName} &middot; {formatBytes(result.size)}
          </div>
        </div>
      </div>

      {/* URL row + QR code side by side */}
      <div className="result-card__body">
        <div className="result-card__body-left">
          {/* Short URL */}
          <div className="url-row" role="group" aria-label="Short URL">
            <span className="url-text" id="short-url-text" title={result.shortUrl}>
              {result.shortUrl}
            </span>
            <button
              id="copy-btn"
              className={`copy-btn${copied ? ' copy-btn--copied' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Copied to clipboard' : 'Copy short URL to clipboard'}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                       strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                       strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">Uploaded</span>
              <span className="stat-value">{uploadDate}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Expires</span>
              <span className="stat-value">{formatExpiry(result.expiresAt)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Code</span>
              <span className="stat-value font-mono">{result.code}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="result-actions">
            <button
              id="upload-another-btn"
              className="btn btn--ghost btn--sm"
              onClick={onReset}
            >
              Upload another
            </button>
            <a
              href={result.viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost btn--sm"
              id="open-image-link"
            >
              Open image
            </a>
          </div>
        </div>

        {/* QR code */}
        <div className="qr-wrap">
          <canvas
            ref={canvasRef}
            className="qr-canvas"
            aria-label={`QR code for ${result.shortUrl}`}
            role="img"
          />
          <span className="qr-label">Scan to open</span>
        </div>
      </div>
    </div>
  );
}
