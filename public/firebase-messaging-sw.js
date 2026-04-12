// ./public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração idêntica à do seu firebase.ts (usando os valores que extraí do seu .env)
const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "1036324838385",
  appId: "1:1036324838385:web:c616886e96996826188437",
  measurementId: "G-2Y0S17V2Y5"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Listener para quando a notificação chega com a APP fechada
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação em Background recebida:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png', // Verifique se este ícone existe na sua pasta public
    badge: '/logo192.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});