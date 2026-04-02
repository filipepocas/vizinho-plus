import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  if (!messaging) {
    toast.error("Notificações não suportadas neste navegador/telemóvel.");
    return;
  }

  try {
    // 1. Pede permissão ao telemóvel do utilizador
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      // 2. SUBSTITUI AQUI a chave que copiaste no Passo 1!
      const vapidKey = "BNR7hvtZ9CIKHDFKZOqRmfrzGbwG_owhrWo7NfpCGaWS1MdA";

      const token = await getToken(messaging, { vapidKey: vapidKey });
      
      if (token) {
        // 3. Guarda o token na Base de Dados para sabermos para quem enviar
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        toast.success("Notificações ativadas! Vais receber alertas.");
      }
    } else {
      toast.error("Não autorizaste as notificações.");
    }
  } catch (error) {
    console.error("Erro ao pedir permissão:", error);
    toast.error("Erro ao ativar as notificações.");
  }
};