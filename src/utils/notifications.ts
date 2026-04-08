import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  // 1. Verificar suporte básico do Browser
  if (!('Notification' in window)) {
    toast.error("O teu telemóvel atual não suporta notificações de sistema.");
    return false;
  }

  if (!messaging) {
    toast.error("Serviço de notificações temporariamente indisponível.");
    return false;
  }

  // 2. Detetar dispositivos iOS (Apple) - A Apple obriga a instalar a app primeiro
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  if (isIOS && !isStandalone) {
    toast.error(
      "Atenção: No iPhone, tens de INSTALAR a App primeiro (Partilhar > Adicionar ao Ecrã) para ativar os alertas!", 
      { duration: 8000 }
    );
    return false;
  }

  try {
    // 3. Pedir permissão nativa
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      const vapidKey = "BNR7hvtZ9CIKHDFKZOqRmfrzGbwG_owhrWo7NfpCGaWS1MdA";

      try {
        // Tenta gerar a chave (É AQUI QUE FALHA NO MODO PRIVADO)
        const token = await getToken(messaging, { vapidKey: vapidKey });
        
        if (token) {
          // Grava o Token no documento do utilizador
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
      } catch (tokenError: any) {
        console.error("Erro Detalhado do Token:", tokenError);
        
        // Deteta se o erro foi causado por Janela Privada (Falta de permissão ao IndexedDB / Service Worker)
        if (
          tokenError?.message?.toLowerCase().includes('indexeddb') || 
          tokenError?.code?.includes('messaging/failed-service-worker-registration') ||
          tokenError?.code?.includes('messaging/unsupported-browser')
        ) {
          toast.error("As notificações não funcionam em Janela Privada/Anónima. Abre a app numa janela normal.", { duration: 6000 });
        } else {
          toast.error("Erro de comunicação com o servidor. Tenta novamente.");
        }
        return false;
      }

    } else if (permission === "denied") {
      toast.error("Permissão recusada. Clica no cadeado na barra de endereço lá em cima para permitir.", { duration: 6000 });
      return false;
    } else {
      toast.error("O pedido de notificação foi ignorado.");
      return false;
    }
  } catch (error: any) {
    console.error("Erro geral nas notificações:", error);
    toast.error("As notificações estão bloqueadas neste navegador.");
    return false;
  }
};