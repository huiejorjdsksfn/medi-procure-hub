import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
export default defineConfig({
  root: '.',
  plugins: [react()],
  server: { port: 5174 },
  build: { outDir: 'dist', target: 'es2017', minify: 'esbuild' },
});
