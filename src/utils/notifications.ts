import OneSignal from 'react-onesignal';
import { db } from "../config/firebase";
import { doc, updateDoc } from "firebase/firestore";
import toast from 'react-hot-toast';

export const requestNotificationPermission = async (userId: string) => {
  // 1. Detetar dispositivos iOS (Apple)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  // A Apple continua a obrigar que a app esteja instalada no ecrã principal para receber Push
  if (isIOS && !isStandalone) {
    toast.error(
      "Atenção iOS: No iPhone/iPad, tens de INSTALAR a App primeiro (Partilhar > Adicionar ao Ecrã) para ativar as notificações!", 
      { duration: 8000 }
    );
    return false;
  }

  try {
    // 2. Mostra a janela pop-up bonita do OneSignal a pedir permissão
    await OneSignal.Slidedown.promptPush();

    // 3. Verifica se o cliente aceitou
    const hasPermission = OneSignal.Notifications.permission;
    
    if (hasPermission) {
      // Faz "Login" do utilizador no OneSignal. Isto permite-te ir ao Painel do OneSignal 
      // e enviar uma mensagem direta para este "userId" específico!
      await OneSignal.login(userId);

      // Pega no ID do telemóvel
      const subscriptionId = OneSignal.User.PushSubscription.id;

      if (subscriptionId) {
        // Grava na Base de Dados (opcional agora, mas útil para ter registo)
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { 
           oneSignalId: subscriptionId 
        });
      }

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