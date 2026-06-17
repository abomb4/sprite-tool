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
    sourcemap: false,  // 生产构建不需要 sourcemap，加速构建
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/web'),
      '@core': resolve(__dirname, 'src/core'),
    },
  },

  server: {
    port: 3000,
    open: false,  // 关闭自动打开浏览器，减少启动干扰
    warmup: {
      // 预编译入口文件和核心模块，减少首次请求延迟
      clientFiles: ['./main.ts', './App.vue', './components/canvas/CanvasRenderer.vue'],
    },
  },
})