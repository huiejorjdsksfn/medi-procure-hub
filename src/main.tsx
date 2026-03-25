import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

// Remove the static loading screen IMMEDIATELY when JS executes
// This runs before React even starts mounting
try {
  const el = document.getElementById('app-loading');
  if (el) el.remove();
} catch(_) {}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[PWA] Service worker ready');
  });
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
