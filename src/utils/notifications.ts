import { db, messaging, VAPID_KEY } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('vplus_device_id', deviceId);
  }
  return deviceId;
};

export const registerDeviceInFirebase = async (userId: string, fcmToken: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    let devices = userData.devices || [];
    const currentDeviceId = getLocalDeviceId();
    const now = Date.now();
    const FORTY_FIVE_DAYS = 45 * 24 * 60 * 60 * 1000;

    devices = devices.filter((d: any) => (now - d.lastLogin) < FORTY_FIVE_DAYS);
    devices = devices.filter((d: any) => d.deviceId !== currentDeviceId);

    if (fcmToken) {
      devices.push({
        deviceId: currentDeviceId,
        token: fcmToken,
        lastLogin: now,
        userAgent: navigator.userAgent.substring(0, 70),
        notificationsEnabled: true
      });
    }

    devices.sort((a: any, b: any) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) {
      devices = devices.slice(0, 2);
    }

    const fcmTokens = devices.map((d: any) => d.token).filter(Boolean);

    await updateDoc(userRef, { 
      devices: devices,
      fcmTokens: fcmTokens,
      notificationsEnabled: fcmTokens.length > 0 ? true : false
    });
  } catch (error) {
    console.error("Erro ao registar dispositivo:", error);
  }
};

export const requestNotificationPermission = async (userId: string): Promise<{success: boolean, error?: string}> => {
  if (!messaging) return { success: false, error: "O navegador não suporta Notificações." };
  if (!('serviceWorker' in navigator)) return { success: false, error: "Service Workers bloqueados pelo navegador." };

  try {
    if (Notification.permission === 'denied') {
      return { success: false, error: "Notificações bloqueadas. Ative nas definições do seu navegador/telemóvel." };
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready; 

        const currentToken = await getToken(messaging, { 
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration 
        });
        
        if (currentToken) {
          await registerDeviceInFirebase(userId, currentToken);
          return { success: true };
        }
        return { success: false, error: "Token da Google não gerado. Verifique a chave VAPID_KEY." };
      } catch (swError: any) {
        return { success: false, error: "Falha de comunicação: " + swError.message };
      }
    } else {
      return { success: false, error: "Permissão recusada pelo utilizador." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro interno de Cloud Messaging." };
  }
};

export const removeCurrentDeviceNotification = async (userId: string) => {
  try {
    const currentDeviceId = getLocalDeviceId();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      let devices = userSnap.data().devices || [];
      devices = devices.filter((d: any) => d.deviceId !== currentDeviceId);
      
      const fcmTokens = devices.map((d: any) => d.token);

      await updateDoc(userRef, { 
        devices: devices,
        fcmTokens: fcmTokens,
        notificationsEnabled: fcmTokens.length > 0 ? true : false
      });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload: any) => resolve(payload));
  });