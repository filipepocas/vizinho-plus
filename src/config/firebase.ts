import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85",
  measurementId: "G-K6L8YEY5L3"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços
export const db = getFirestore(app);
export const auth = getAuth(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Auth secundário para provisionamento (criar contas sem trocar sessão do admin)
export const provisionAuth = (() => {
  const name = 'provision';
  const provisionApp = getApps().some(a => a.name === name) ? getApp(name) : initializeApp(firebaseConfig, name);
  return getAuth(provisionApp);
})();

export default app;