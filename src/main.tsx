import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Service worker is registered automatically by vite-plugin-pwa
// with injectManifest strategy - see src/sw.ts for push notification handling

createRoot(document.getElementById("root")!).render(<App />);
