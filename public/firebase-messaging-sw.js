// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAZc0WqXxax4PongdY25SIveqyTX0SgFoM",
  authDomain: "vizinho-plus.firebaseapp.com",
  projectId: "vizinho-plus",
  storageBucket: "vizinho-plus.firebasestorage.app",
  messagingSenderId: "359894288352",
  appId: "1:359894288352:web:3e5ca9ea8246e4264c4d85",
  measurementId: "G-9MCBEED7FB"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Esta função é o que faz a magia na versão V1
messaging.onBackgroundMessage((payload) => {
  console.log('Mensagem em background:', payload);
  const notificationTitle = payload.notification.title || 'Vizinho+';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});