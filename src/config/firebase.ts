// ./src/config/firebase.ts

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

// Configuração extraída diretamente para garantir que o registo não falhe por variáveis de ambiente
export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "vizinho-plus.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "vizinho-plus",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "vizinho-plus.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1036324838385",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1036324838385:web:c616886e96996826188437",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-2Y0S17V2Y5"
};

// Inicialização segura da App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Inicialização condicional para ambientes de Browser (Evita erros em SSR ou builds)
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Exportação para o provisionamento (se necessário em outras partes do sistema)
export const provisionAuth = (() => {
  const name = 'provision';
  const provisionApp = getApps().some(a => a.name === name) ? getApp(name) : initializeApp(firebaseConfig, name);
  return getAuth(provisionApp);
})();

export default app;