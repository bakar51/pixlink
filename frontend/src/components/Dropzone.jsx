/**
 * components/Dropzone.jsx
 *
 * Handles image selection via:
 *  1. Drag-and-drop onto the zone
 *  2. Click-to-browse (hidden file input)
 *
 * On file selection:
 *  - Validates type (JPEG/PNG/WebP/GIF) and size (max 10 MB) client-side
 *  - Generates a local object URL for the live preview image
 *  - Runs client-side compression (browser-image-compression)
 *  - Shows original vs compressed file size in a badge
 *  - Calls onFileReady(compressedFile, compressionResult) for the parent
 *
 * Props:
 *  onFileReady(file, compressionResult) — called when a valid file is ready
 *  onError(message)                      — called on validation failure
 *  disabled                              — disables interaction during upload
 */

import { useState, useRef, useCallback } from 'react';
import { compressImage, formatBytes } from '../utils/compress';

// Client-side whitelist (mirrors the server-side whitelist in validate.js)
const ALLOWED_TYPES   = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_BYTES  = 10 * 1024 * 1024; // 10 MB

export default function Dropzone({ onFileReady, onError, disabled }) {
  const [dragOver,     setDragOver]     = useState(false);
  const [preview,      setPreview]      = useState(null);   // object URL
  const [fileName,     setFileName]     = useState('');
  const [compResult,   setCompResult]   = useState(null);  // { originalSize, compressedSize, savedPercent }
  const [compressing,  setCompressing]  = useState(false);
  const inputRef = useRef(null);

  // Clean up previous preview URL to avoid memory leaks
  const revokePrev = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  /**
   * processFile(file)
   * Validates, compresses, and prepares the file for upload.
   */
  const processFile = useCallback(async (file) => {
    // Type validation
    if (!ALLOWED_TYPES.has(file.type)) {
      onError(`Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF.`);
      return;
    }

    // Size validation (before compression)
    if (file.size > MAX_FILE_BYTES) {
      onError(`File too large. Maximum is 10 MB (yours is ${formatBytes(file.size)}).`);
      return;
    }

    // Show preview immediately using the original file
    revokePrev();
    setPreview(URL.createObjectURL(file));
    setFileName(file.name);
    setCompResult(null);
    setCompressing(true);

    try {
      const result = await compressImage(file);
      setCompResult(result);
      setCompressing(false);
      onFileReady(result.compressed, result);
    } catch (err) {
      setCompressing(false);
      // Compression failed — fall back to original file
      onFileReady(file, { originalSize: file.size, compressedSize: file.size, savedPercent: 0 });
    }
  }, [onFileReady, onError, revokePrev]);

  // ── Drag event handlers ────────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragOver(true);  };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Click-to-browse ────────────────────────────────────────────────────────
  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input value so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      inputRef.current?.click();
    }
  };

  const zoneClasses = [
    'dropzone',
    dragOver && !disabled ? 'dropzone--drag-over' : '',
  ].join(' ').trim();

  return (
    <div
      id="dropzone"
      className={zoneClasses}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload area — click or drag an image here"
      aria-disabled={disabled}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        id="file-input"
        className="dropzone__input"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onInputChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
      />

      {!preview ? (
        /* ── Empty state ──────────────────────────────────────────────── */
        <>
          <svg className="dropzone__icon" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
               strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <p className="dropzone__headline">
            {dragOver ? 'Release to upload' : 'Drop an image here'}
          </p>
          <p className="dropzone__sub">
            or click to browse — JPEG, PNG, WebP, GIF up to 10 MB
          </p>
        </>
      ) : (
        /* ── Preview state ────────────────────────────────────────────── */
        <div
          className="dropzone__preview"
          onClick={(e) => e.stopPropagation()} // don't trigger file picker on preview click
        >
          <img src={preview} alt="Selected image preview" />
          <div className="dropzone__preview-meta">
            <span className="dropzone__preview-name" title={fileName}>{fileName}</span>

            {compressing ? (
              <span className="size-badge text-muted">Compressing...</span>
            ) : compResult ? (
              <span className="size-badge">
                <span>{formatBytes(compResult.originalSize)}</span>
                <span className="size-badge__arrow">→</span>
                <span className="size-badge__after">
                  {formatBytes(compResult.compressedSize)}
                  {compResult.savedPercent > 0 && ` (−${compResult.savedPercent}%)`}
                </span>
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
