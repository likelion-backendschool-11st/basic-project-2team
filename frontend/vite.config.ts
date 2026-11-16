import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // BrowserRouter: 중첩 경로(/board/1)에서도 에셋을 절대 경로로 불러옵니다
  plugins: [react()],
})
