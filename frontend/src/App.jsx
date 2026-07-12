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
import ViewPage       from './components/ViewPage';

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

  // Simple client-side routing
  const path = window.location.pathname;
  const isViewPage = path.startsWith('/i/');
  const viewCode = isViewPage ? path.split('/')[2] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Unified Header */}
      <header className="app-header" role="banner">
        <a href="/" className="app-logo">
          Pix<span>Link</span>
        </a>
        <div className="header-actions">
          {isViewPage && (
            <a href="/" className="button button-outline new-upload-btn">
              New Upload
            </a>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main work area */}
      <main className="app-main" id="main-content" role="main">
        {isViewPage ? (
          <ViewPage code={viewCode} />
        ) : result ? (
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

        {/* Recent uploads — only show on homepage */}
        {!isViewPage && (
          <RecentUploads
            uploads={recentList}
            onClear={handleClearRecent}
          />
        )}
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
