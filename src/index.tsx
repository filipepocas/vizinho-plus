// src/index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { StoreProvider } from './store/StoreProvider';
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

// Os service workers necessários para notificações são registados apenas quando o utilizador
// ativa as notificações, para evitar erros em produção por tentar carregar um ficheiro
// que não existe no Firebase Hosting.

// Medição de performance da aplicação (padrão do React)
reportWebVitals();