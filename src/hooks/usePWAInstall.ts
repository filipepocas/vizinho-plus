import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Deteta se é iPhone/iPad
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Verifica se já está instalada (a correr como app)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Se for iOS e não estiver instalada, consideramos "instalável" via partilha
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(true);
    }

    // Ouve o evento do Android/Chrome para instalar
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("App instalada com sucesso!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (isIOS) {
      alert("No iPhone/iPad:\n\n1. Toque no ícone de Partilhar (quadrado com uma seta para cima) no fundo do ecrã.\n2. Escolha a opção 'Adicionar ao ecrã principal'.");
      return false;
    }

    if (!deferredPrompt) return false;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { isInstallable, isInstalled, installApp };
};