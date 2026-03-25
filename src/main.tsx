import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// Remove the static HTML loading screen once React mounts
const loadingDiv = document.getElementById('app-loading');
if (loadingDiv) loadingDiv.remove();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[PWA] Service worker ready');
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
