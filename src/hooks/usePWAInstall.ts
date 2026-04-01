import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// 1. VARIÁVEIS GLOBAIS
// Capturam o evento mal o site abre (ex: na página de Login), 
// para não se perder quando o utilizador navega para os Dashboards.
let globalDeferredPrompt: any = null;
let globalIsInstallable = false;
const listeners: Set<() => void> = new Set();

const notifyListeners = () => listeners.forEach(fn => fn());

// 2. ESCUTA GLOBAL DO EVENTO
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Previne que o Chrome mostre o mini-aviso nativo imediatamente
    e.preventDefault();
    // Guarda o evento para usarmos no nosso botão
    globalDeferredPrompt = e;
    globalIsInstallable = true;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    globalIsInstallable = false;
    notifyListeners();
    toast.success("App instalada com sucesso!");
  });
}

// 3. O HOOK QUE OS DASHBOARDS CONSOMEM
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(globalIsInstallable);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Função para atualizar o botão nos Dashboards se o estado global mudar
    const updateState = () => setIsInstallable(globalIsInstallable);
    listeners.add(updateState);

    // Deteta se é dispositivo Apple (iOS)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Verifica se a app JÁ ESTÁ a correr como App Instalada (Standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    } else if (isIosDevice) {
      // No iOS a Apple não suporta o 'beforeinstallprompt'. 
      // Por isso, se for iOS e não estiver instalada, forçamos o botão a aparecer.
      setIsInstallable(true);
    } else {
      // Sincroniza com a variável global para Android/Chrome/PC
      setIsInstallable(globalIsInstallable);
    }

    return () => {
      listeners.delete(updateState);
    };
  }, []);

  const installApp = async () => {
    if (isIOS) {
      // A Apple não permite instalação automática por botão. 
      // Temos de mostrar as instruções nativas.
      alert("Para instalar no iPhone/iPad:\n\n1. Toque no ícone de Partilhar (quadrado com uma seta para cima) no fundo do ecrã.\n2. Escolha a opção 'Adicionar ao ecrã principal' (Add to Home Screen).");
      return false;
    }

    if (!globalDeferredPrompt) {
      alert("A instalação não está disponível neste momento. Tente abrir o site no Google Chrome ou verifique se já a tem instalada nas suas Aplicações.");
      return false;
    }
    
    try {
      // Dispara o prompt de instalação do Google Chrome / Android
      globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        globalIsInstallable = false;
        setIsInstallable(false);
        globalDeferredPrompt = null;
        notifyListeners();
      }
      return outcome === 'accepted';
    } catch (error) {
      console.error("Erro no prompt de instalação:", error);
      return false;
    }
  };

  return { isInstallable, isInstalled, installApp };
};