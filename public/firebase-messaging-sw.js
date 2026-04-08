/* eslint-disable no-restricted-globals */
// Importa as bibliotecas do Firebase para o fundo do navegador
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

// ATENÇÃO: Como este ficheiro corre isolado do React, tens de colar 
// as tuas chaves do Firebase aqui DIRETAMENTE (não pode usar process.env)
const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.appspot.com",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85"
};

// Inicializa o Firebase no fundo
firebase.initializeApp(firebaseConfig);

// Inicializa o serviço de mensagens
const messaging = firebase.messaging();

// Lida com as notificações quando a app está fechada
messaging.onBackgroundMessage(function(payload) {
  console.log('Notificação recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png',
    badge: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});