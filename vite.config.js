import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: "/teacher-upload/",
  plugins: [
    vue(),
    visualizer({ open: true })
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
  }
})

