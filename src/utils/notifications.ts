import { getToken } from "firebase/messaging";
import { messaging, db } from "../config/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  // Verifica se o navegador suporta notificações
  if (!('Notification' in window)) {
    toast.error("Este navegador não suporta notificações.");
    return;
  }

  if (!messaging) {
    toast.error("O sistema de mensagens não está configurado corretamente.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      // SUBSTITUI pela tua chave VAPID gerada na consola do Firebase (Cloud Messaging -> Web configuration)
      const vapidKey = "BNR7hvtZ9CIKHDFKZOqRmfrzGbwG_owhrWo7NfpCGaWS1MdA";

      toast.loading("A gerar chave segura no dispositivo...", { id: "notif-toast" });

      const token = await getToken(messaging, { vapidKey: vapidKey });
      
      if (token) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        });
        toast.success("Notificações ativadas! Vais receber alertas da App.", { id: "notif-toast" });
      } else {
        toast.error("Erro: Não foi possível gerar o token do dispositivo.", { id: "notif-toast" });
      }
    } else {
      toast.error("Acesso bloqueado. Ativa as notificações nas definições do teu telemóvel/navegador.");
    }
  } catch (error: any) {
    console.error("Erro detalhado nas notificações:", error);
    toast.error(`Falha ao ativar: ${error.message}`, { id: "notif-toast" });
  }
};