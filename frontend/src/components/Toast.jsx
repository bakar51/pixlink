/**
 * components/Toast.jsx
 *
 * A simple toast notification system.
 *
 * Usage:
 *   const { showToast, ToastContainer } = useToast();
 *   showToast('Upload complete');
 *   showToast('Something went wrong', 'error');
 *   <ToastContainer />
 *
 * Toasts auto-dismiss after `duration` ms (default 3500).
 * The exit animation runs for 200 ms before the DOM node is removed.
 */

import { useState, useCallback } from 'react';

let toastIdCounter = 0;

/**
 * useToast()
 *
 * Returns:
 *  - showToast(message, type?, duration?) → void
 *  - ToastContainer: React component to render in the JSX tree
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  /**
   * showToast(message, type, duration)
   *
   * @param {string} message
   * @param {'default'|'error'} [type='default']
   * @param {number} [duration=3500] - ms before auto-dismiss
   */
  const showToast = useCallback((message, type = 'default', duration = 3500) => {
    const id = ++toastIdCounter;

    // Add toast to list
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // After duration, mark as exiting to trigger exit animation
    const exitTimer = setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );

      // Remove from DOM after animation completes
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 220);
    }, duration);

    return () => clearTimeout(exitTimer);
  }, []);

  const ToastContainer = useCallback(() => (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'toast',
            toast.type === 'error' ? 'toast--error' : '',
            toast.exiting         ? 'toast--out'   : '',
          ].join(' ').trim()}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          {toast.message}
        </div>
      ))}
    </div>
  ), [toasts]);

  return { showToast, ToastContainer };
}
