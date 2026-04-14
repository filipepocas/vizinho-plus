// src/utils/notifications.ts

import { db, messaging, VAPID_KEY } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";

/**
 * PONTO 1: Gera ou recupera um ID único para este aparelho específico.
 */
export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
    localStorage.setItem('vplus_device_id', deviceId);
  }
  return deviceId;
};

/**
 * PONTO 1: Lógica central de gestão de equipamentos (Máx 2 e Limpeza 45 dias)
 */
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

    // 1. LIMPEZA: Remove dispositivos que não aparecem há mais de 45 dias
    devices = devices.filter((d: any) => (now - d.lastLogin) < FORTY_FIVE_DAYS);

    // 2. ATUALIZAÇÃO: Remove este dispositivo da lista se já lá estiver
    devices = devices.filter((d: any) => d.deviceId !== currentDeviceId);

    // 3. ADICIONA: Insere o dispositivo atual
    devices.push({
      deviceId: currentDeviceId,
      token: fcmToken,
      lastLogin: now,
      userAgent: navigator.userAgent.substring(0, 70),
      notificationsEnabled: true
    });

    // 4. LIMITE DE 2: Ordena por data e mantém apenas os últimos 2
    devices.sort((a: any, b: any) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) {
      devices = devices.slice(0, 2);
    }

    // 5. SINCRONIZAÇÃO: Atualiza os tokens FCM para o Admin
    const fcmTokens = devices.map((d: any) => d.token);

    await updateDoc(userRef, { 
      devices: devices,
      fcmTokens: fcmTokens 
    });
  } catch (error) {
    console.error("Erro ao registar dispositivo:", error);
  }
};

/**
 * PONTO 4: Solicita permissão e retorna o erro exato se falhar
 */
export const requestNotificationPermission = async (userId: string): Promise<{success: boolean, error?: string}> => {
  if (!messaging) return { success: false, error: "O seu navegador não suporta notificações Cloud Messaging." };

  try {
    if (Notification.permission === 'denied') {
      return { success: false, error: "As notificações foram bloqueadas no seu navegador. Ative-as nas definições do site (ícone do cadeado)." };
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        await registerDeviceInFirebase(userId, currentToken);
        return { success: true };
      }
      return { success: false, error: "Não foi possível gerar a credencial de segurança da Google." };
    } else {
      return { success: false, error: "A permissão foi recusada pelo utilizador." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Erro de ligação ao Firebase Cloud Messaging." };
  }
};

/**
 * PONTO 1: Função para o cliente desativar notificações de UM aparelho (REINSTALADA)
 */
export const removeCurrentDeviceNotification = async (userId: string) => {
  try {
    const currentDeviceId = getLocalDeviceId();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      let devices = userSnap.data().devices || [];
      // Remove apenas o dispositivo onde o utilizador está agora
      devices = devices.filter((d: any) => d.deviceId !== currentDeviceId);
      
      const fcmTokens = devices.map((d: any) => d.token);

      await updateDoc(userRef, { 
        devices: devices,
        fcmTokens: fcmTokens
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => resolve(payload));
  });