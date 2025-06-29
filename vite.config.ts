import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KBS Earthmovers & Harvester',
        short_name: 'KBS Earthmovers',
        start_url: '.',
        display: 'standalone',
        background_color: '#fff7ed',
        theme_color: '#f59e0b',
        description: 'Professional heavy machinery rental services. JCB, Tractor, and Harvester rentals with experienced operators.',
        icons: [
          {
            src: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/Logo for KBS Earthmovers - Bold Industrial Design.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
