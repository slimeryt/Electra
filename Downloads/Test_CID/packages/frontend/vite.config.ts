import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { readFileSync } from 'fs';

const desktopPkg = JSON.parse(readFileSync(path.resolve(__dirname, '../desktop/package.json'), 'utf8'));
// Build version (e.g. "1.7.0") — auto-updater needs it to increase monotonically.
// Display version strips the leading major and uses 0.x.y so the UI reflects alpha status.
const BUILD_VERSION = desktopPkg.version as string;
const DISPLAY_VERSION = BUILD_VERSION.replace(/^\d+\./, '0.');

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
      },
      manifest: {
        name: 'Electra',
        short_name: 'Electra',
        description: 'Chat, voice, and servers',
        theme_color: '#1e1f22',
        background_color: '#1e1f22',
        display: 'standalone',
        orientation: 'any',
        scope: './',
        start_url: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(DISPLAY_VERSION),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
