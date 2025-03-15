import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import VConsole from 'vconsole';

const vConsole = new VConsole();

createApp(App).use(vConsole).mount('#app')
