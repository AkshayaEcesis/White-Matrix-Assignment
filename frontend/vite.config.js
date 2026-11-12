import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Same-origin proxy: the browser talks only to :5173, so the HttpOnly
      // refresh cookie is first-party and SameSite=Strict works.
      proxy: {
        '/api': { target: env.VITE_DEV_API_PROXY || 'http://localhost:8000', changeOrigin: true },
      },
    },
    optimizeDeps: {
      // Pre-bundle up front so Vite does not re-optimise mid-session
      // (avoids EBUSY rename errors on Windows).
      include: [
        'react', 'react-dom', 'react-dom/client', 'react-router-dom', 'axios', 'recharts',
        'lucide-react', 'react-hook-form', 'zod', '@hookform/resolvers/zod',
      ],
    },
    build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  }
})
