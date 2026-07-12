/**
 * firebase.js — Firebase initialization for PixLink
 *
 * Config is loaded from .env (VITE_ prefix = exposed to browser by Vite).
 * For production these values are baked in at build time (npm run build).
 *
 * Exports:
 *   auth           — Firebase Auth instance
 *   googleProvider — GoogleAuthProvider (pre-configured)
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Always prompt account picker — even if already signed in to one account
googleProvider.setCustomParameters({ prompt: 'select_account' });
