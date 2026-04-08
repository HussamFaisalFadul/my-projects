import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // هذا الجزء هو الحل الجذري لمشكلة الـ Rollup والـ External modules
    rollupOptions: {
      external: [], 
    },
    // التأكد من توافق جافا سكريبت مع المتصفحات
    target: 'esnext'
  }
})
