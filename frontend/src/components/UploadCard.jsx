/**
 * components/UploadCard.jsx
 *
 * Shown below the Dropzone when a file has been selected and is ready to upload.
 * Contains:
 *  - Expiry selector (Never / 1 day / 7 days / 30 days)
 *  - Upload button
 *  - Progress bar (real XMLHttpRequest progress event, not fake)
 *
 * Props:
 *  file       {File}     — compressed file ready to upload
 *  onSuccess  {Function} — called with the API response JSON on success
 *  onError    {Function} — called with an error message string on failure
 */

import { useState, useRef } from 'react';

export default function UploadCard({ file, onSuccess, onError }) {
  const [expiry,    setExpiry]    = useState('never');
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);  // 0–100
  const xhrRef = useRef(null);

  const handleUpload = () => {
    if (!file || uploading) return;

    const formData = new FormData();
    formData.append('file',   file);
    formData.append('expiry', expiry);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // ── Real upload progress ──────────────────────────────────────────────
    // xhr.upload.onprogress fires with loaded/total as bytes transferred,
    // giving us a genuine percentage rather than a fake animation.
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setProgress(0);

      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          onSuccess(data);
        } catch {
          onError('Unexpected response from server. Please try again.');
        }
      } else if (xhr.status === 429) {
        onError('Too many uploads. Please wait a moment before trying again.');
      } else {
        let message = 'Upload failed. Please try again.';
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.error) message = err.error;
        } catch { /* use default message */ }
        onError(message);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setProgress(0);
      onError('Network error. Check your connection and try again.');
    };

    xhr.onabort = () => {
      setUploading(false);
      setProgress(0);
    };

    xhr.open('POST', '/api/upload');
    setUploading(true);
    setProgress(0);
    xhr.send(formData);
  };

  const handleCancel = () => {
    xhrRef.current?.abort();
  };

  return (
    <div className="upload-controls">
      {/* Expiry selector */}
      <div className="expiry-group">
        <label htmlFor="expiry-select">Link expiry</label>
        <select
          id="expiry-select"
          className="expiry-select"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          disabled={uploading}
        >
          <option value="never">Never</option>
          <option value="1d">1 day</option>
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      </div>

      {/* Upload / Cancel button */}
      {uploading ? (
        <button
          id="cancel-upload-btn"
          className="btn btn--ghost"
          onClick={handleCancel}
          aria-label="Cancel upload"
        >
          Cancel
        </button>
      ) : (
        <button
          id="upload-btn"
          className="btn btn--primary"
          onClick={handleUpload}
          disabled={!file}
          aria-label="Upload image and generate link"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
          Get link
        </button>
      )}

      {/* Progress bar — only shown during upload */}
      {uploading && (
        <div style={{ width: '100%' }}>
          <div className="progress-label">
            <span>Uploading...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-wrap" role="progressbar"
               aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
               aria-label="Upload progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
