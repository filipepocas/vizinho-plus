import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

let globalDeferredPrompt: any = null;

// Ouve o evento do Chrome/Android logo que o site arranca
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    window.dispatchEvent(new Event('pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    window.dispatchEvent(new Event('pwa-install-ready'));
  });
}

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Deteta se é um dispositivo Apple (iOS)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Deteta se já está instalado (Standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

    const checkInstallability = () => {
      if (isStandalone) {
        setIsInstallable(false); // Já está instalado
      } else if (isIosDevice) {
        setIsInstallable(true); // iOS é sempre "instalável" via tutorial manual
      } else {
        setIsInstallable(!!globalDeferredPrompt); // Android depende do prompt nativo
      }
    };

    checkInstallability();
    window.addEventListener('pwa-install-ready', checkInstallability);
    return () => window.removeEventListener('pwa-install-ready', checkInstallability);
  }, []);

  const installApp = async () => {
    // Lógica para iPhone/iPad
    if (isIOS) {
      alert("🍏 PARA INSTALAR NO iPHONE:\n\n1. Toque no ícone 'Partilhar' (quadrado com seta para cima) na barra inferior do Safari.\n2. Deslize para baixo e escolha 'Adicionar ao Ecrã Principal'.");
      return false;
    }

    // Lógica para Android / Chrome
    if (!globalDeferredPrompt) {
      toast.error("O teu navegador não suporta a instalação direta ou a app já está instalada.");
      return false;
    }
    
    try {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setIsInstallable(false);
        toast.success("A iniciar instalação...");
      }
      return outcome === 'accepted';
    } catch (error) {
      console.error("Erro na instalação:", error);
      return false;
    }
  };

  return { isInstallable, installApp };
};