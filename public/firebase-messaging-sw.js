// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85",
  measurementId: "G-K6L8YEY5L3"
});

// Inicializa a app em segundo plano
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// O que fazer quando a notificação chega e a app está fechada
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Notificação recebida em segundo plano.', payload);
  
  const notificationTitle = payload.notification.title || 'Novo Aviso Vizinho+';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});