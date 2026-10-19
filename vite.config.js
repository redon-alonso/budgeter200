import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  // El único fragmento grande es SheetJS (xlsx), que se carga bajo demanda al importar
  build: { chunkSizeWarningLimit: 600 },
})
