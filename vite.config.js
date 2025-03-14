import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: "/teacher-upload/",
  plugins: [
    vue(),
    visualizer({ open: true })
  ],
  build: {
    rollupOptions: {
      external: ['html2canvas', 'dompurify', 'canvg'],
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

