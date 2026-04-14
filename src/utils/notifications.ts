// src/utils/notifications.ts

import { db, messaging, VAPID_KEY } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

/**
 * PONTO 1: Gera ou recupera um ID único para este aparelho específico.
 * Isto permite-nos saber qual dispositivo remover sem afetar os outros do mesmo email.
 */
export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    // Cria um ID aleatório robusto
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

    // 2. ATUALIZAÇÃO: Remove este dispositivo da lista se já lá estiver (para o reinserir como mais recente)
    devices = devices.filter((d: any) => d.deviceId !== currentDeviceId);

    // 3. ADICIONA: Insere o dispositivo atual no topo
    devices.push({
      deviceId: currentDeviceId,
      token: fcmToken,
      lastLogin: now,
      userAgent: navigator.userAgent.substring(0, 70), // Identifica se é iPhone/Android/etc
      notificationsEnabled: true
    });

    // 4. LIMITE DE 2: Ordena por data e mantém apenas os últimos 2
    devices.sort((a: any, b: any) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) {
      devices = devices.slice(0, 2);
    }

    // 5. SINCRONIZAÇÃO: Atualiza o array de tokens principal (fcmTokens) para o Admin poder enviar
    const fcmTokens = devices.map((d: any) => d.token);

    await updateDoc(userRef, { 
      devices: devices,
      fcmTokens: fcmTokens 
    });
    
    console.log("Equipamentos atualizados com sucesso no Firebase.");
  } catch (error) {
    console.error("Erro ao registar dispositivo:", error);
  }
};

/**
 * Solicita permissão e regista o token no Firestore
 */
export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) return false;

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        await registerDeviceInFirebase(userId, currentToken);
        return true;
      }
    } else {
      toast.error("Precisas de autorizar as notificações para receber cashback.");
      return false;
    }
  } catch (error) {
    console.error("Erro ao configurar notificações:", error);
    return false;
  }
};

/**
 * PONTO 1: Função para o cliente desativar notificações apenas de UM aparelho específico
 */
export const removeCurrentDeviceNotification = async (userId: string) => {
  try {
    const currentDeviceId = getLocalDeviceId();
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      let devices = userSnap.data().devices || [];
      // Remove o dispositivo atual da lista
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