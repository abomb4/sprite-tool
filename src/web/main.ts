import { createApp } from 'vue'
import App from './App.vue'

// 全局 CSS reset
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; }
  #app { width: 100%; height: 100%; }
`
document.head.appendChild(style)

createApp(App).mount('#app')