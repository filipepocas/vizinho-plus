// src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { StoreProvider } from './store/StoreProvider';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
);

// Ativa o Progressive Web App (PWA) para permitir a instalação no telemóvel
// sem precisares de publicar na Google Play Store ou Apple App Store.
// (Isto vai ler o ficheiro serviceWorkerRegistration.ts que criaste)
serviceWorkerRegistration.register();

// Medição de performance da aplicação (padrão do React)
reportWebVitals();