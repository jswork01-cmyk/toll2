import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @ 기호를 사용 중이라면 경로를 맞춰줍니다.
      '@': '/src',
    },
  },
  build: {
    // 404 에러 방지: 빌드 결과물이 상대 경로를 참조하도록 설정
    assetsDir: 'assets',
    rollupOptions: {
      // external 설정을 완전히 삭제했습니다.
    },
    commonjsOptions: {
      // Recharts의 의존성인 react-is를 강제로 포함시킵니다.
      include: [/react-is/, /node_modules/],
    },
  },
});
