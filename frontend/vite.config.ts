import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Operação FMUSP 2028',
        short_name: 'Op FMUSP',
        description: 'Sistema inteligente de estudos rumo à Medicina na FMUSP — cronograma, RPG, IA e muito mais.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts')) return 'vendor-charts'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/react')) return 'vendor-react'
        },
      },
    },
  },
})
