import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/figure_maker/', // Correct repo name
  plugins: [react()],
})
