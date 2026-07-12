import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * vite.config.js
 *
 * In development, proxy /api/* and /i/* requests to the Express backend
 * so the React dev server (port 5173) and Express (port 4000) work together
 * without CORS issues during local development.
 *
 * In production the React build is served as static files by Nginx,
 * which handles the same routing at the reverse-proxy level.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Forward API requests to Express
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Output to frontend/dist — this is what Nginx serves in production
    outDir: 'dist',
    sourcemap: false,
  },
});
