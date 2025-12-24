
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react-is 경로 문제를 직접 해결합니다.
      'react-is': 'react-is',
    },
  },
  build: {
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      // Recharts 내부의 react-is 모듈을 Vite가 잘 처리하도록 돕습니다.
      include: [/react-is/, /node_modules/],
    },
  },
})
