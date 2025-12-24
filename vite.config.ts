
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 명시적으로 react-is를 패키지 이름으로 매핑합니다.
      'react-is': 'react-is',
    },
  },
  build: {
    rollupOptions: {
      // 에러 메시지 권장대로 external 설정을 확인하되, 
      // 오히려 내부로 잘 말려들어가게 commonjs 처리를 강화합니다.
      external: [],
    },
    commonjsOptions: {
      // recharts와 react-is가 꼬이지 않도록 명시적으로 포함시킵니다.
      include: [/react-is/, /node_modules/],
    },
  },
  optimizeDeps: {
    // 개발 및 빌드 준비 단계에서 미리 최적화 목록에 넣습니다.
    include: ['react-is', 'recharts'],
  },
});
