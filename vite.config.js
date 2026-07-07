/**
 * Vite 开发配置
 * 根目录指向 src/frontend/，开发服务器端口 3000
 */
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/frontend',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
});
