import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ⚡ OFFLINE MODE: Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 🚀 Fixed the path to use the root slash correctly for Vercel
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('🚀 Offline Mode Ready: SW Registered!');
      })
      .catch(err => {
        console.log('❌ SW Registration Failed:', err);
      });
  });
}