import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react-is를 패키지 이름으로 명시적으로 매핑
      'react-is': 'react-is',
    },
  },
  build: {
    rollupOptions: {
      // 1. 에러 메시지 지시대로 빌드 과정에서 react-is를 제외(external)시킵니다.
      external: ['react-is'],
      output: {
        globals: {
          'react-is': 'ReactIs',
        },
      },
    },
    // 2. 외부 모듈 처리 방식 설정
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  // 3. 의존성 최적화 대상에 명시적으로 추가
  optimizeDeps: {
    include: ['react-is', 'recharts'],
  },
});
