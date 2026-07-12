/**
 * main.jsx — React entry point
 *
 * Mounts the App component to #root.
 * index.css is imported here so it is bundled by Vite.
 * AuthProvider wraps the entire tree so auth state is globally available.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
