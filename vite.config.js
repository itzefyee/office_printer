import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Split Phaser (~3 MB) into its own chunk so the browser can cache it
        // independently from game-code changes. The game chunk stays small and
        // can be re-fetched cheaply on every deploy.
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  }
});
