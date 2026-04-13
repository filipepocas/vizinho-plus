// public/firebase-messaging-sw.js

// Importação das bibliotecas oficiais do Firebase (Versão 10.8.0 Compat)
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Configuração com as tuas credenciais reais
const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85",
  measurementId: "G-9MCBEED7FB"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gere as notificações quando o telemóvel está com o ecrã desligado ou app fechada
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background: ', payload);
  
  // Extrai o título e a mensagem com segurança para evitar erros de leitura
  const notificationTitle = payload.notification?.title || 'Vizinho+';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação recebida!',
    icon: '/logo192.png', // Garante que este ficheiro existe na tua pasta public
    badge: '/logo192.png'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});