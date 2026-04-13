// src/utils/notifications.ts

import { db, auth, messaging } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import toast from 'react-hot-toast';

// ⚠️ ATENÇÃO: Substitui o valor abaixo pela tua chave real gerada no Firebase Console!
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
    
    // 2. Remove o aparelho atual da lista para atualizar os dados
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
    console.log("FCM Token registado no Firestore com sucesso.");
  } catch (error) {
    console.error("Erro ao registar dispositivo FCM:", error);
  }
};

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) {
    console.warn("FCM não é suportado neste ambiente.");
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
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      // Obtém o Token do FCM usando a tua VAPID KEY
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (currentToken) {
        await registerDeviceInFirebase(userId, currentToken);
        toast.success("Notificações ativadas com sucesso!");
        return true;
      } else {
        toast.error("Não foi possível gerar o token de acesso.");
        return false;
      }
    } else {
      toast.error("Permissão de notificações recusada.");
      return false;
    }
  } catch (error) {
    console.error("Erro ao solicitar permissão FCM:", error);
    toast.error("Erro ao configurar notificações. Verifica se a chave VAPID está correta no código.");
    return false;
  }
};

// Liga/Desliga Notificações (FCM)
export const toggleNotifications = async (userId: string, enable: boolean) => {
  try {
    if (enable) {
      return await requestNotificationPermission(userId);
    } else {
      // Para desativar no FCM, limpamos o token do Firestore para este aparelho
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
      toast.success("Notificações desativadas neste equipamento.");
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