import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // VitePWA handles SW registration automatically
    console.log('[PWA] Service worker support detected');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
