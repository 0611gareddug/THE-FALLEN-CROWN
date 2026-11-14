import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    assetsInlineLimit: 0,
    terserOptions: {
      compress: { passes: 2, drop_debugger: false },
      format: { comments: false },
    },
    rollupOptions: {
      output: { manualChunks: undefined, entryFileNames: 'assets/[hash].js', assetFileNames: 'assets/[hash][extname]' },
    },
  },
});
