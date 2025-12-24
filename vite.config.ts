
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react-is를 찾지 못하는 문제를 해결하기 위해 실제 경로를 매핑합니다.
      'react-is': 'react-is',
    },
  },
  build: {
    rollupOptions: {
      // 빌드 시 외부 모듈로 빠지지 않도록 빈 배열로 설정하거나 명시적으로 관리합니다.
      external: [],
    },
    commonjsOptions: {
      // Recharts 같은 라이브러리가 사용하는 CommonJS 모듈을 제대로 처리하게 합니다.
      include: [/react-is/, /node_modules/],
    },
  },
})
