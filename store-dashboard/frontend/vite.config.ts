import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // هذا السطر سيخبر Vite: "حتى لو وجدت أحداً يطلب lucide، تجاهله ولا توقف الـ Build"
      external: ['lucide-react'],
    },
  },
})
