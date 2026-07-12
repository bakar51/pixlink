/**
 * main.jsx — React entry point
 *
 * Mounts the App component to #root.
 * index.css is imported here so it is bundled by Vite.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
