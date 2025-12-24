import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 경로를 직접 연결하지 않고 이름을 명시합니다.
      'react-is': 'react-is',
    },
  },
  build: {
    rollupOptions: {
      // 에러 메시지의 지시대로 react-is를 빌드 대상에서 제외(external)시킵니다.
      external: ['react-is'],
      output: {
        globals: {
          'react-is': 'ReactIs',
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});
