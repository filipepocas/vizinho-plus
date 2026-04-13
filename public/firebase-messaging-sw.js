// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// As tuas credenciais exatas do ficheiro firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "1036324838385",
  appId: "1:1036324838385:web:c616886e96996826188437",
  measurementId: "G-2Y0S17V2Y5"
};

// Inicializa a app no background
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gere as notificações quando a app está fechada/minimizada
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em background ', payload);
  
  const notificationTitle = payload.notification?.title || 'Vizinho+';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação recebida!',
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});