// src/features/public/InstallPage.tsx

import React from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Share2, PlusSquare, ArrowDown } from 'lucide-react';

const InstallPage: React.FC = () => {
  const { isInstallable, installApp } = usePWAInstall();
  const logoPath = process.env.PUBLIC_URL + '/logo-vizinho.png';

  const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-[#0a2540] flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-white text-[#0a2540] rounded-[40px] border-4 border-[#00d66f] shadow-2xl p-10 max-w-md text-center animate-in zoom-in">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-4">App Instalada!</h2>
          <p className="text-sm font-bold text-slate-500 mb-6">O Vizinho+ já está no seu ecrã principal. Feche este separador e abra a aplicação.</p>
          <p className="text-[10px] font-black uppercase text-slate-400">Pode fechar esta janela.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 text-center animate-in slide-in-from-bottom-10">
        
        <img src={logoPath} alt="Vizinho+" className="h-16 w-auto object-contain mx-auto mb-8" />
        
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4">
          Instalar <span className="text-[#00d66f]">Vizinho+</span>
        </h1>
        <p className="text-sm font-bold text-slate-500 mb-10 leading-relaxed">
          Tenha a App no seu ecrã principal para um acesso mais rápido, notificações instantâneas e uma experiência completa.
        </p>

        {isIOS ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-[30px] p-6 space-y-4 animate-in zoom-in">
            <div className="bg-white p-3 rounded-2xl border-2 border-blue-100 inline-block">
              <Share2 size={28} className="text-blue-500" />
            </div>
            <h3 className="font-black uppercase text-blue-800 text-lg">Passo a passo no iPhone/iPad</h3>
            <ol className="text-left text-[11px] font-bold text-blue-700 space-y-3 mt-4">
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">1</span>
                Toque no ícone <strong className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200"><Share2 size={12} /> Partilhar</strong> na barra inferior do Safari.
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">2</span>
                Deslize para baixo e escolha <strong className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200"><PlusSquare size={12} /> Adicionar ao Ecrã Principal</strong>.
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">3</span>
                Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito.
              </li>
            </ol>
            <ArrowDown size={20} className="mx-auto text-blue-400 animate-bounce mt-2" />
          </div>
        ) : (
          <button
            onClick={installApp}
            disabled={!isInstallable}
            className={`w-full p-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-xl border-b-8 ${
              isInstallable
                ? 'bg-[#0a2540] text-[#00d66f] border-black/50 hover:bg-black hover:scale-[1.02]'
                : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
            }`}
          >
            <Smartphone size={24} />
            {isInstallable ? 'Instalar Aplicação' : 'App já instalada ou não suportada'}
          </button>
        )}

        <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest mt-8">
          Vizinho+ &copy; 2026 • Comércio Local
        </p>
      </div>
    </div>
  );
};

export default InstallPage;