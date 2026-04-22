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
// This allows the app to load even when there is no Wi-Fi
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('🚀 Offline Mode Ready: SW Registered!'))
      .catch(err => console.log('❌ SW Registration Failed:', err));
  });
}