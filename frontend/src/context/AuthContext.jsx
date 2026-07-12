/**
 * AuthContext.jsx — Global authentication state for PixLink
 *
 * Provides:
 *   user        — current Firebase user (null if logged out)
 *   loading     — true while Firebase is resolving initial auth state
 *   signInWithGoogle() — opens Google popup and signs in
 *   signOut()          — signs the user out
 */

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // resolving initial session

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  /** Open Google sign-in popup */
  async function signInWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // user closed popup — not a real error
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', err);
      }
    }
  }

  /** Sign the current user out */
  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — call inside any component to access auth state */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
