// src/config/firebase.ts

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85",
  measurementId: "G-9MCBEED7FB"
};

// Chave VAPID (Substitui pelo valor que encontrares na consola do Firebase)
export const VAPID_KEY = "BFch8QBtlRHM4JDH-wZ5MxfDJDZDzXTs49J14ic8a2qH5sgUiaYJsQQ_KAeoJwrjQER_DpPR27GWt4KsRuxSIIY";

// Inicialização segura da App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Inicialização condicional para ambientes de Browser
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Exportação para o provisionamento
export const provisionAuth = (() => {
  const name = 'provision';
  const provisionApp = getApps().some(a => a.name === name) ? getApp(name) : initializeApp(firebaseConfig, name);
  return getAuth(provisionApp);
})();

export default app;