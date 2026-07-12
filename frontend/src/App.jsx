/**
 * App.jsx — PixLink application root
 *
 * State machine:
 *
 *   idle → (file selected) → ready → (upload) → uploading → success
 *                ↑                                              |
 *                └──────────────── (reset) ───────────────────┘
 *
 * Auth guard:
 *   loading → spinner
 *   !user   → <LoginPage />
 *   user    → full app
 *
 * IMPORTANT: ALL hooks must be declared before any early returns (React rule).
 */

import { useState, useCallback } from 'react';

import Dropzone       from './components/Dropzone';
import UploadCard     from './components/UploadCard';
import ResultCard     from './components/ResultCard';
import RecentUploads  from './components/RecentUploads';
import ThemeToggle    from './components/ThemeToggle';
import { useToast }   from './components/Toast';
import ViewPage       from './components/ViewPage';
import LoginPage      from './components/LoginPage';
import { useAuth }    from './context/AuthContext';

import { addRecent, getRecent, clearRecent } from './utils/storage';

export default function App() {
  // ── ALL hooks FIRST — no early returns before this block ───────────────────
  const { user, loading, signOut } = useAuth();

  const [file,       setFile]       = useState(null);
  const [compResult, setCompResult] = useState(null);
  const [result,     setResult]     = useState(null);
  const [recentList, setRecentList] = useState(() => getRecent());

  const { showToast, ToastContainer } = useToast();

  /** Called by Dropzone when a valid, compressed file is ready */
  const handleFileReady = useCallback((compressedFile, compressionResult) => {
    setFile(compressedFile);
    setCompResult(compressionResult);
    setResult(null);
  }, []);

  /** Called by Dropzone on validation failure */
  const handleError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  /** Called by UploadCard on successful upload */
  const handleSuccess = useCallback((data) => {
    setResult(data);
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

  /** Resets back to idle state */
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

  // ── Auth guards (AFTER all hooks) ──────────────────────────────────────────

  // Firebase resolving initial session → show spinner
  if (loading) {
    return (
      <div className="auth-loading" role="status" aria-label="Loading">
        <span className="auth-spinner" />
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // ── Routing ────────────────────────────────────────────────────────────────
  const path       = window.location.pathname;
  const isViewPage = path.startsWith('/i/');
  const viewCode   = isViewPage ? path.split('/')[2] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Header */}
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

          {/* User avatar + logout */}
          <div className="user-menu">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName ?? 'User avatar'}
                className="user-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="user-avatar user-avatar--fallback">
                {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
              </div>
            )}
            <button
              id="logout-btn"
              className="btn btn--ghost btn--sm"
              onClick={signOut}
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main work area */}
      <main className="app-main" id="main-content" role="main">
        {isViewPage ? (
          <ViewPage code={viewCode} />
        ) : result ? (
          <ResultCard result={result} onReset={handleReset} />
        ) : (
          <>
            <Dropzone
              onFileReady={handleFileReady}
              onError={handleError}
              disabled={false}
            />
            {file && (
              <UploadCard
                file={file}
                onSuccess={handleSuccess}
                onError={handleUploadError}
              />
            )}
          </>
        )}

        {!isViewPage && (
          <RecentUploads
            uploads={recentList}
            onClear={handleClearRecent}
          />
        )}
      </main>

      <ToastContainer />
    </div>
  );
}
