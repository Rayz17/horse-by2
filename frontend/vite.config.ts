import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 8080
  }
});
