import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

const MAIN_VERSION = '1.1.0'; // 加入 vConsole 手機除錯主控台
console.log(`[main] version ${MAIN_VERSION}`);

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount('#app');

const debugRequested = new URLSearchParams(location.search).has('debug')
  || localStorage.getItem('debug') === '1';

if (debugRequested) {
  localStorage.setItem('debug', '1');
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole();
  });
}
