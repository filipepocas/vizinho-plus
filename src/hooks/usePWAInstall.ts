import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

let globalDeferredPrompt: any = null;
let globalIsInstallable = false;

// Ouve o evento do Chrome/Android logo que o site arranca para não o perder
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Impede o Chrome de mostrar o banner automático imediatamente
    e.preventDefault();
    // Guarda o evento para ser usado mais tarde pelo botão
    globalDeferredPrompt = e;
    globalIsInstallable = true;
    // Avisa todos os componentes que a App pode ser instalada
    window.dispatchEvent(new Event('pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsInstallable = false;
    window.dispatchEvent(new Event('pwa-install-ready'));
    console.log('Vizinho+ instalado com sucesso!');
  });
}

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(globalIsInstallable);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Deteção de dispositivo iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Verifica se a App já está instalada (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    const checkInstallability = () => {
      if (isStandalone) {
        setIsInstallable(false);
      } else if (isIosDevice) {
        // No iOS, não existe evento de prompt, mostramos sempre o botão com as instruções
        setIsInstallable(true);
      } else {
        // No Android/Chrome, depende do evento global ter sido disparado
        setIsInstallable(globalIsInstallable);
      }
    };

    // Executa a verificação ao montar o componente
    checkInstallability();

    // Re-verifica sempre que o evento global disparar
    window.addEventListener('pwa-install-ready', checkInstallability);
    return () => window.removeEventListener('pwa-install-ready', checkInstallability);
  }, []);

  const installApp = async () => {
    // Lógica específica para iPhone
    if (isIOS) {
      alert("Para instalar no iPhone ou iPad:\n\n1. Toque no ícone de Partilhar (quadrado com seta para cima) no fundo do seu ecrã.\n2. Escolha a opção 'Adicionar ao ecrã principal' (Add to Home Screen).");
      return false;
    }

    // Lógica para Android / Chrome Desktop
    if (!globalDeferredPrompt) {
      toast.error("O teu navegador não suporta a instalação direta ou a app já está instalada.");
      return false;
    }
    
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        globalIsInstallable = false;
        setIsInstallable(false);
        globalDeferredPrompt = null;
        toast.success("Obrigado por instalar o Vizinho+!");
      }
      return outcome === 'accepted';
    } catch (error) {
      console.error("Erro na instalação:", error);
      return false;
    }
  };

  return { isInstallable, installApp };
};