// src/utils/notifications.ts

import { db, messaging } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

// A TUA CHAVE VAPID CORRETA
const VAPID_KEY = "BFch8QBtIRHM4JDH-wZ5MxfDJDZDzXTs49J14ic8a2qH5sgUiaYJsQQ_KAeoJwrjQER_DpPR27GWt4KsRuxSIlY"; 

// Gera um ID único para o browser/equipamento atual para controlo interno
export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem('vplus_device_id', deviceId);
  }
  return deviceId;
};

// Regista/Atualiza o equipamento na Base de Dados (Máximo 2, Limpa aos 45 dias)
export const registerDeviceInFirebase = async (userId: string, fcmToken: string | null = null) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const userData = userSnap.data();
    let devices: any[] = userData.devices || [];
    
    const now = Date.now();
    const FORTY_FIVE_DAYS = 45 * 24 * 60 * 60 * 1000;
    
    // 1. Limpa equipamentos inativos
    devices = devices.filter(d => (now - d.lastLogin) < FORTY_FIVE_DAYS);
    
    const currentDeviceId = getLocalDeviceId();
    const userAgent = navigator.userAgent;
    
    // 2. Remove o aparelho atual da lista
    devices = devices.filter(d => d.deviceId !== currentDeviceId);
    
    // 3. Adiciona o aparelho com o token FCM atualizado
    if (fcmToken) {
      devices.push({
        deviceId: currentDeviceId,
        userAgent: userAgent.substring(0, 100),
        lastLogin: now,
        fcmToken: fcmToken
      });
    }
    
    // 4. Mantém apenas os últimos 2 aparelhos
    devices.sort((a, b) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) {
      devices = devices.slice(0, 2);
    }
    
    await updateDoc(userRef, { devices });
    console.log("FCM Token registado no Firestore.");
  } catch (error) {
    console.error("Erro ao registar dispositivo FCM:", error);
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
    toast.error(
      "No iPhone, precisas de INSTALAR a App (Partilhar > Adicionar ao Ecrã) para ativar notificações.", 
      { duration: 8000 }
    );
    return false;
  }

  try {
    // Pede permissão ao utilizador
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      
      // CORREÇÃO CRUCIAL PARA REACT PWA:
      // Forçamos o navegador a registar e usar o Service Worker do Firebase especificamente!
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // Obtém o Token do FCM indicando explicitamente qual o Service Worker a usar
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        await registerDeviceInFirebase(userId, currentToken);
        toast.success("Notificações ativadas com sucesso!");
        return true;
      } else {
        toast.error("O Firebase não devolveu nenhum token.");
        return false;
      }
    } else {
      toast.error("Permissão de notificações recusada no browser.");
      return false;
    }
  } catch (error: any) {
    console.error("ERRO COMPLETO DO FIREBASE:", error);
    // AGORA VAI MOSTRAR O ERRO REAL DO FIREBASE NO ECRÃ DO TELEMÓVEL!
    toast.error(`Erro Firebase: ${error.message}`, { duration: 8000 });
    return false;
  }
};

// Liga/Desliga Notificações
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
        
        devices = devices.map((d: any) => 
          d.deviceId === currentDeviceId ? { ...d, fcmToken: null } : d
        );
        
        await updateDoc(userRef, { devices });
      }
      toast.success("Notificações desativadas.");
      return true;
    }
  } catch (e) {
    console.error("Erro no Toggle FCM:", e);
    return false;
  }
};

// Listener para mensagens recebidas com a app aberta (Foreground)
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });