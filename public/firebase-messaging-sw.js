/* eslint-disable no-restricted-globals */
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// TEM DE TER AS TUAS CHAVES REAIS AQUI (COPIADAS DO FICHEIRO .env)
const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.appspot.com",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85"
};

// Inicializa o Firebase no fundo do navegador
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Lida com as notificações quando a app está fechada
messaging.onBackgroundMessage(function(payload) {
  console.log('Notificação em segundo plano: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});