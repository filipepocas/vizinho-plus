// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// SUBSTITUI ESTE BLOCO PELOS TEUS DADOS DO FIREBASE
const firebaseConfig = {
apiKey: "A tua API Key",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.appspot.com",
  messagingSenderId: "teu-id",
  appId: "teu-app-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços para usar na App
export const db = getFirestore(app);
export const auth = getAuth(app);