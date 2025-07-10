import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/captcha': 'http://localhost:8000',
      '/logout': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/api-keys': 'http://localhost:8000',
      '/embed': 'http://localhost:8000',
      '/classify': 'http://localhost:8000',
      '/custom-task': 'http://localhost:8000',
      '/custom-tasks': 'http://localhost:8000',
      '/models': 'http://localhost:8000',
      '/settings': 'http://localhost:8000',
      '/qa': 'http://localhost:8000',
      '/ner': 'http://localhost:8000',
      '/fill-mask': 'http://localhost:8000',
      '/summarize': 'http://localhost:8000',
      '/api/login': 'http://localhost:8000',
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
