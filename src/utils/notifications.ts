// src/utils/notifications.ts

import { db, messaging } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

// A TUA CHAVE VAPID REAL
const VAPID_KEY = "BFch8QBtIRHM4JDH-wZ5MxfDJDZDzXTs49J14ic8a2qH5sgUiaYJsQQ_KAeoJwrjQER_DpPR27GWt4KsRuxSIlY"; 

export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem('vplus_device_id', deviceId);
  }
  return deviceId;
};

export const registerDeviceInFirebase = async (userId: string, fcmToken: string | null = null) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    let devices: any[] = userData.devices || [];
    
    const now = Date.now();
    devices = devices.filter(d => (now - d.lastLogin) < (45 * 24 * 60 * 60 * 1000));
    
    const currentDeviceId = getLocalDeviceId();
    devices = devices.filter(d => d.deviceId !== currentDeviceId);
    
    if (fcmToken) {
      devices.push({
        deviceId: currentDeviceId,
        userAgent: navigator.userAgent.substring(0, 100),
        lastLogin: now,
        fcmToken: fcmToken
      });
    }
    
    devices.sort((a, b) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) devices = devices.slice(0, 2);
    
    await updateDoc(userRef, { devices });
  } catch (error) {
    console.error("Erro ao registar dispositivo:", error);
  }
};

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) {
    toast.error("O teu navegador não suporta notificações web.");
    return false;
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  if (isIOS && !isStandalone) {
    toast.error("No iPhone, precisas de INSTALAR a App para ativar notificações.", { duration: 8000 });
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      
      // Regista o Service Worker especifico para as Notificações do Firebase
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready; // Espera que ele esteja totalmente ativo
      
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        await registerDeviceInFirebase(userId, currentToken);
        toast.success("Notificações ativadas com sucesso!");
        
        if (window.location.pathname === '/register' || window.location.pathname === '/login') {
           window.location.href = '/dashboard';
        }
        return true;
      } else {
        toast.error("O Firebase não devolveu token.");
        return false;
      }
    } else {
      toast.error("Permissão de notificações recusada.");
      return false;
    }
  } catch (error: any) {
    console.error("ERRO FIREBASE:", error);
    toast.error(`Erro Firebase: ${error.message}`, { duration: 8000 });
    return false;
  }
};

export const toggleNotifications = async (userId: string, enable: boolean) => {
  try {
    if (enable) {
      return await requestNotificationPermission(userId);
    } else {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentDeviceId = getLocalDeviceId();
        let devices = userSnap.data().devices || [];
        devices = devices.map((d: any) => d.deviceId === currentDeviceId ? { ...d, fcmToken: null } : d);
        await updateDoc(userRef, { devices });
      }
      toast.success("Notificações desativadas.");
      return true;
    }
  } catch (e) {
    return false;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => resolve(payload));
  });