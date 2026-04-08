import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    },
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, '')
      },
      '/api/newsapi': {
        target: 'https://newsapi.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/newsapi/, '')
      },
      '/api/gnews': {
        target: 'https://gnews.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gnews/, '')
      },
      '/api/newsdata': {
        target: 'https://newsdata.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/newsdata/, '')
      },
      '/api/scraper': {
        target: 'https://api.scraperapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/scraper/, '')
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
