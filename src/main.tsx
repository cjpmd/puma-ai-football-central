import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register custom service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // The PWA plugin will register its own service worker
      // But we also register our custom sw.js for push notification handling
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('Custom SW registered:', registration.scope);
    } catch (error) {
      console.log('Custom SW registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
