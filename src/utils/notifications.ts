import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  if (!('Notification' in window)) {
    toast.error("O teu telemóvel ou navegador não suporta notificações.");
    return false;
  }

  if (!messaging) {
    toast.error("O serviço de mensagens do Firebase não arrancou.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      
      // A CHAVE COMPLETA E CORRETA (JÁ INSERIDA AQUI)
      const vapidKey = "BNR7hvtZ9CIKHDFKZOqRmfrzGbwG_owhrWo7NfpCGaWS1MdAknrvt_w_kspYaOYN2sKBXveQ-pO0l8NF5W3kF4I";

      // Regista o ficheiro de fundo
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Pede o token de segurança à Google com a chave verdadeira
      const token = await getToken(messaging, { 
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration 
      });
      
      if (token) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
        toast.success("Alertas Ativados com sucesso! Vais receber avisos.", { duration: 5000 });
        return true;
      } else {
        toast.error("A Google não devolveu nenhum token de segurança.");
        return false;
      }
    } else {
      toast.error("Permissão recusada. Não vais receber alertas.");
      return false;
    }
  } catch (error: any) {
    console.error("ERRO COMPLETO:", error);
    toast.error(`ERRO FIREBASE: ${error.message || error.code || 'Erro Desconhecido'}`, { duration: 10000 });
    return false;
  }
};