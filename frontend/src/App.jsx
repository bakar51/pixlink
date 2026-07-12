/**
 * App.jsx — PixLink application root
 *
 * State machine:
 *
 *   idle → (file selected) → ready → (upload) → uploading → success
 *                ↑                                              |
 *                └──────────────── (reset) ───────────────────┘
 *
 * The single "work area" below the header transitions smoothly between:
 *  - idle/ready:  Dropzone + upload controls
 *  - success:     ResultCard (morphs in via CSS animation)
 *
 * Recent uploads are maintained in localStorage and shown below the work area.
 */

import { useState, useCallback } from 'react';

import Dropzone       from './components/Dropzone';
import UploadCard     from './components/UploadCard';
import ResultCard     from './components/ResultCard';
import RecentUploads  from './components/RecentUploads';
import ThemeToggle    from './components/ThemeToggle';
import { useToast }   from './components/Toast';

import { addRecent, getRecent, clearRecent } from './utils/storage';

export default function App() {
  // Selected (compressed) file + its compression stats
  const [file,         setFile]         = useState(null);
  const [compResult,   setCompResult]   = useState(null);

  // Upload result from API
  const [result,       setResult]       = useState(null);

  // recent uploads list (from localStorage)
  const [recentList,   setRecentList]   = useState(() => getRecent());

  const { showToast, ToastContainer } = useToast();

  // ── Callbacks ──────────────────────────────────────────────────────────────

  /** Called by Dropzone when a valid, compressed file is ready */
  const handleFileReady = useCallback((compressedFile, compressionResult) => {
    setFile(compressedFile);
    setCompResult(compressionResult);
    setResult(null); // clear any previous result
  }, []);

  /** Called by Dropzone on validation failure */
  const handleError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  /** Called by UploadCard on successful upload */
  const handleSuccess = useCallback((data) => {
    setResult(data);

    // Persist to localStorage recent list
    addRecent({
      code:         data.code,
      shortUrl:     data.shortUrl,
      viewUrl:      data.viewUrl,
      originalName: data.originalName,
      size:         data.size,
      uploadedAt:   data.uploadedAt,
      expiresAt:    data.expiresAt,
    });
    setRecentList(getRecent());
  }, []);

  /** Called by UploadCard on upload error */
  const handleUploadError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  /** Resets back to the idle state */
  const handleReset = useCallback(() => {
    setFile(null);
    setCompResult(null);
    setResult(null);
  }, []);

  /** Clears the recent uploads list */
  const handleClearRecent = useCallback(() => {
    clearRecent();
    setRecentList([]);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header" role="banner">
        <span className="app-logo">
          Pix<span>Link</span>
        </span>
        <ThemeToggle />
      </header>

      {/* Main work area */}
      <main className="app-main" id="main-content" role="main">
        {result ? (
          /* ── Success: result card ─────────────────────────────────── */
          <ResultCard result={result} onReset={handleReset} />
        ) : (
          /* ── Idle / Ready: dropzone + upload controls ─────────────── */
          <>
            <Dropzone
              onFileReady={handleFileReady}
              onError={handleError}
              disabled={false}
            />

            {/* Upload controls appear once a file is chosen */}
            {file && (
              <UploadCard
                file={file}
                onSuccess={handleSuccess}
                onError={handleUploadError}
              />
            )}
          </>
        )}

        {/* Recent uploads — always visible below the work area */}
        <RecentUploads
          uploads={recentList}
          onClear={handleClearRecent}
        />
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
