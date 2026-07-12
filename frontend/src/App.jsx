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
import Gallery        from './components/Gallery';

import { addRecent, getRecent, clearRecent } from './utils/storage';

export default function App() {
  // ── ALL hooks FIRST — no early returns before this block ───────────────────
  const { user, loading, signOut, signInWithGoogle } = useAuth();

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

          {/* User Menu / Sign In */}
          <div className="user-menu">
            {user ? (
              <>
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
              </>
            ) : (
              <button
                className="button button-outline"
                onClick={signInWithGoogle}
                aria-label="Sign in"
                style={{ padding: '6px 12px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Sign in
              </button>
            )}
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
          user ? (
            <Gallery />
          ) : (
            <RecentUploads
              uploads={recentList}
              onClear={handleClearRecent}
            />
          )
        )}
      </main>

      <ToastContainer />
    </div>
  );
}
