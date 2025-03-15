import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

export default defineConfig({
  base: "/teacher-upload/",
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue'],
          'pdf-libs': ['jspdf'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false
  },
  server: {
    host: '0.0.0.0'
  }
})

