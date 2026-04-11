// src/utils/notifications.ts

import OneSignal from 'react-onesignal';
import { db } from "../config/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

// Gera um ID único para o browser/equipamento atual e guarda no telemóvel
export const getLocalDeviceId = () => {
  let deviceId = localStorage.getItem('vplus_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    localStorage.setItem('vplus_device_id', deviceId);
  }
  return deviceId;
};

// Regista/Atualiza o equipamento na Base de Dados (Máximo 2, Limpa aos 45 dias)
export const registerDeviceInFirebase = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    let devices: any[] = userData.devices || [];

    const now = Date.now();
    const FORTY_FIVE_DAYS = 45 * 24 * 60 * 60 * 1000;

    // 1. Limpa equipamentos que não fazem login há mais de 45 dias
    devices = devices.filter(d => (now - d.lastLogin) < FORTY_FIVE_DAYS);

    const currentDeviceId = getLocalDeviceId();
    const userAgent = navigator.userAgent;

    // 2. Remove este aparelho da lista (caso já exista) para não haver duplicados
    devices = devices.filter(d => d.deviceId !== currentDeviceId);

    // 3. Adiciona o aparelho com a data de hoje e o ID das Notificações
    devices.push({
      deviceId: currentDeviceId,
      userAgent: userAgent.substring(0, 100),
      lastLogin: now,
      oneSignalId: OneSignal.User?.PushSubscription?.id || null
    });

    // 4. Garante que só ficam os últimos 2 aparelhos (ordena do mais recente para o mais antigo)
    devices.sort((a, b) => b.lastLogin - a.lastLogin);
    if (devices.length > 2) {
      devices = devices.slice(0, 2);
    }

    // Grava no Firebase
    await updateDoc(userRef, { devices });
  } catch (error) {
    console.error("Erro ao registar dispositivo:", error);
  }
};

export const requestNotificationPermission = async (userId: string) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  if (isIOS && !isStandalone) {
    toast.error(
      "Atenção iOS: No iPhone/iPad, tens de INSTALAR a App primeiro (Partilhar > Adicionar ao Ecrã) para ativar as notificações!", 
      { duration: 8000 }
    );
    return false;
  }

  try {
    await OneSignal.Slidedown.promptPush();
    const hasPermission = OneSignal.Notifications.permission;
    
    if (hasPermission) {
      await OneSignal.login(userId);
      await OneSignal.User.PushSubscription.optIn(); // Força a ativação caso estivesse desligada

      // Aguarda 2 segundos para o OneSignal gerar o ID e grava o aparelho no Firebase
      setTimeout(() => registerDeviceInFirebase(userId), 2000);

      toast.success("Alertas Ativados com sucesso! Vais receber avisos.", { duration: 5000 });
      return true;
    } else {
      toast.error("Permissão recusada. Se mudares de ideias, ativa no cadeado lá em cima.", { duration: 6000 });
      return false;
    }
  } catch (error: any) {
    console.error("ERRO ONESIGNAL:", error);
    toast.error("Erro ao configurar as notificações. Tenta novamente.", { duration: 5000 });
    return false;
  }
};

// Permite ao cliente desligar ou ligar as notificações manualmente neste telemóvel
export const toggleNotifications = async (userId: string, enable: boolean) => {
  try {
    if (enable) {
      await OneSignal.User.PushSubscription.optIn();
      setTimeout(() => registerDeviceInFirebase(userId), 2000);
      toast.success("Notificações reativadas para este equipamento.");
    } else {
      await OneSignal.User.PushSubscription.optOut();
      // Removemos o oneSignalId da BD para o Admin não tentar enviar para um telemóvel inativo
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        let devices = userSnap.data().devices || [];
        const currentId = getLocalDeviceId();
        devices = devices.map((d: any) => d.deviceId === currentId ? { ...d, oneSignalId: null } : d);
        await updateDoc(userRef, { devices });
      }
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};