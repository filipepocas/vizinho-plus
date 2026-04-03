import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

let globalDeferredPrompt: any = null;
let globalIsInstallable = false;

// Ouve o evento do Chrome/Android logo que o site arranca
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    globalIsInstallable = true;
    window.dispatchEvent(new Event('pwa-install-ready'));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsInstallable = false;
    window.dispatchEvent(new Event('pwa-install-ready'));
  });
}

export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    const checkInstallability = () => {
      if (isStandalone) {
        setIsInstallable(false);
      } else if (isIosDevice) {
        // iOS não tem prompt automático, temos de mostrar as instruções sempre
        setIsInstallable(true);
      } else {
        setIsInstallable(globalIsInstallable);
      }
    };

    checkInstallability();

    window.addEventListener('pwa-install-ready', checkInstallability);
    return () => window.removeEventListener('pwa-install-ready', checkInstallability);
  }, []);

  const installApp = async () => {
    if (isIOS) {
      alert("Para instalar no iPhone ou iPad:\n\n1. Toque no ícone de Partilhar (quadrado com seta para cima) no fundo do seu ecrã.\n2. Escolha a opção 'Adicionar ao ecrã principal' (Add to Home Screen).");
      return false;
    }

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