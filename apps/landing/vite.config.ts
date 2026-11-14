import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: { port: 5175, strictPort: true },
  plugins: [
    vue(),
    tailwindcss(),
    {
      // In production scripts/prerender.ts fills the SEO head; in dev just set a title
      name: 'landing-dev-head',
      apply: 'serve',
      transformIndexHtml: (html) => html.replace('<!--head-tags-->', '<title>AptoPH (dev)</title>'),
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Small single page: inline tiny assets, keep CSS in one file
    cssCodeSplit: false,
  },
})
