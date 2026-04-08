import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // لا تضع lucide-react في external – يجب أن يُضمّن في الحزمة
  build: {
    rollupOptions: {
      // external: []   // احذف هذا السطر تماماً
    },
  },
})
