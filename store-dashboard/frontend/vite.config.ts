import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // لا تضع lucide-react في external، بل اتركه يُضمّن في الحزمة
  build: {
    rollupOptions: {
      // إذا أردت استثناء شيء، لكن ليس lucide-react
      // external: []  
    },
  },
})
