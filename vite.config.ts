import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5199,
    watch: {
      ignored: [
        '**/sentinel-report.html',
        '**/sentinel-pr-comment.md',
        '**/mock-target/**',
        '**/triggers/**',
        '**/dist/**',
        '**/src/public/**',
        '**/*.log',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/sentinel-report.html': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/sentinel-pr-comment.md': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'src/public',
    emptyOutDir: false,
  },
});
