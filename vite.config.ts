import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],

  root: resolve(__dirname, 'src/web'),

  base: './',

  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/web/index.html'),
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    minify: 'esbuild',
    sourcemap: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/web'),
      '@core': resolve(__dirname, 'src/core'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },
})