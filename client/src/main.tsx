import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from "virtual:pwa-register";
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true }); // 即時更新

// 端末の空き容量が少ないときにブラウザがIndexedDBのデータを消さないよう、永続化を要求する
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)