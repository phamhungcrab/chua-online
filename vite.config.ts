import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, 'src/client'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        overlay: path.resolve(__dirname, 'src/client/overlay.html'),
        admin: path.resolve(__dirname, 'src/client/admin.html')
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
