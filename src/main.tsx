import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && !window.Buffer) {
  (window as unknown as Record<string, unknown>).Buffer = Buffer;
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
