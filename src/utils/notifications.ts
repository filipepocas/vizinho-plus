import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  // 1. Verificar suporte do Browser
  if (!('Notification' in window)) {
    toast.error("O teu telemóvel atual não suporta notificações de sistema.");
    return false;
  }

  if (!messaging) {
    toast.error("Serviço de notificações temporariamente indisponível.");
    return false;
  }

  // 2. Detetar dispositivos iOS (Apple) para prevenção de erro clássico
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  // A Apple exige que a app Web esteja instalada no ecrã para aceitar Push Notifications
  if (isIOS && !isStandalone) {
    toast.error(
      "Atenção iOS: No iPhone, tens de INSTALAR a App primeiro (Partilhar > Adicionar ao Ecrã Principal) para as notificações funcionarem!", 
      { duration: 8000 }
    );
    return false;
  }

  try {
    // 3. Pedir permissão nativa
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      // VAPID KEY fornecida pelo Firebase Cloud Messaging
      const vapidKey = "BNR7hvtZ9CIKHDFKZOqRmfrzGbwG_owhrWo7NfpCGaWS1MdA";

      const token = await getToken(messaging, { vapidKey: vapidKey });
      
      if (token) {
        // Grava o Token no documento do utilizador (As regras Firestore atuais permitem isto)
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        toast.success("Alertas Ativados! Vais ser notificado em tempo real.");
        return true;
      } else {
        toast.error("Falha ao gerar a chave de segurança da notificação.");
        return false;
      }
    } else if (permission === "denied") {
      toast.error("Permissão recusada. Terás de ativar nas definições do telemóvel.");
      return false;
    } else {
      toast.error("O pedido de notificação foi ignorado.");
      return false;
    }
  } catch (error: any) {
    console.error("Erro nas notificações:", error);
    if (error?.code === 'messaging/unsupported-browser') {
       toast.error("O teu browser atual não suporta notificações em segundo plano.");
    } else {
       toast.error("Erro técnico ao ativar os alertas. Verifica as permissões de notificações nas definições do teu telemóvel.");
    }
    return false;
  }
};