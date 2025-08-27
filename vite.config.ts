import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()
    , VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Pomodoro Timer App',
        short_name: 'Pomodoro',
        description: 'helps you manage your time effectively using the Pomodoro Technique and stay focused on your tasks and overcome procrastination.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
