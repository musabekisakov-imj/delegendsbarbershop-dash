import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Allow Cloudflare tunnel hostnames so the dev server can be exposed via
  // `cloudflared tunnel --url http://localhost:5173` for client previews.
  // Vite 5+ otherwise rejects unknown Host headers with 403 (CVE-2025-24010).
  server: {
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.ngrok.io'],
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split vendor deps into stable chunks so:
        //  - the main bundle stops being 545kb
        //  - users cache vendor code across app deploys
        //  - the heaviest libs (recharts) stay on the analytics chunk only
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
          ],
          'vendor-date': ['date-fns'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Framer Motion (renamed `motion`) — heavy, lazy-loaded with the
          // first page that uses it. Pulled into its own chunk so adding it
          // to more pages later doesn't re-cost users the download.
          'vendor-motion': ['motion'],
        },
      },
    },
  },
})
