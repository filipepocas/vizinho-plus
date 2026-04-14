// src/features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { 
  LogIn, Mail, Lock, ArrowRight, Smartphone, ShieldCheck, 
  Zap, Store, X, CheckCircle2, Loader2, AlertTriangle, Volume2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { requestNotificationPermission, registerDeviceInFirebase } from '../../utils/notifications';

// CORREÇÃO: Definir explicitamente que estas funções podem ser recebidas
interface LoginPageProps {
  installPrompt: any;
  onRegister?: () => void;
  onForgotPassword?: () => void;
}

const MERCH_CATEGORIES = ["Restauração & Bebidas", "Mercearias", "Talhos & Peixarias", "Moda", "Saúde", "Beleza", "Oficinas", "Outros"];

const LoginPage: React.FC<LoginPageProps> = ({ installPrompt, onRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(false);
  const [tempUserId, setTempUserId] = useState('');
  
  const [diagError, setDiagError] = useState<string | null>(null);
  const [submittingMerchant, setSubmittingMerchant] = useState(false);
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  
  const [merchantData, setMerchantData] = useState({
    shopName: '', responsibleName: '', nif: '', email: '', phone: '', category: '', cashbackPercent: '5', zipCode: '', freguesia: ''
  });

  const { isInstallable, installApp } = usePWAInstall();
  const navigate = useNavigate();
  const { setCurrentUser } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as any;
        
        const hasNotif = Notification.permission === 'granted';
        const isApp = window.matchMedia('(display-mode: standalone)').matches;

        if (!hasNotif || (isInstallable && !isApp)) {
          setTempUserId(uid);
          setSetupStep(true);
          setLoading(false);
          if (!hasNotif) handleTryNotifs(uid);
          return;
        }

        finalizeLogin(userData);
      }
    } catch (error) { 
      toast.error('EMAIL OU PASSWORD INCORRETOS.'); 
      setLoading(false); 
    }
  };

  const finalizeLogin = async (userData: any) => {
    await registerDeviceInFirebase(userData.id, ""); 
    setCurrentUser(userData);
    
    if (userData.role === 'admin') navigate('/admin');
    else if (userData.role === 'merchant') navigate('/merchant');
    else navigate('/dashboard');
  };

  const handleTryNotifs = async (uid: string) => {
    const result = await requestNotificationPermission(uid);
    if (!result.success) {
      setDiagError(result.error || "Não foi possível ativar as notificações.");
    } else {
      setDiagError(null);
      toast.success("Notificações ligadas!");
    }
  };

  const handleTryInstall = async () => {
    const success = await installApp();
    if (!success) {
      setDiagError("O browser impediu a instalação. No iPhone, use 'Partilhar' > 'Adicionar ao Ecrã Principal'.");
    }
  };

  const handleMerchantRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingMerchant(true);
    try {
      await addDoc(collection(db, 'merchant_requests'), { 
        ...merchantData, 
        status: 'pending', 
        createdAt: serverTimestamp() 
      });
      toast.success('PEDIDO ENVIADO! AGUARDE CONTACTO.');
      setShowMerchantModal(false);
    } catch (err) { 
      toast.error('ERRO AO ENVIAR PEDIDO.'); 
    } finally {
      setSubmittingMerchant(false);
    }
  };

  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 text-center animate-in zoom-in">
            <div className="bg-blue-50 p-6 rounded-3xl mb-6">
                <h2 className="text-xl font-black uppercase text-[#0a2540] mb-2 italic">Configuração Necessária</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Para sua segurança e acesso ao cashback, precisamos de validar o seu equipamento.</p>
            </div>

            {diagError && (
              <div className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl mb-6 flex gap-3 text-left">
                  <AlertTriangle className="text-red-500 shrink-0" size={20} />
                  <p className="text-[10px] font-bold text-red-700 leading-tight uppercase">{diagError}</p>
              </div>
            )}

            <div className="space-y-3 mb-8">
                {isInstallable && (
                    <button onClick={handleTryInstall} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar App
                    </button>
                )}
                <button onClick={() => handleTryNotifs(tempUserId)} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[4px_4px_0px_#0a2540]">
                    <Volume2 size={24} /> Ativar Notificações
                </button>
            </div>

            <div className="border-t-2 border-slate-100 pt-6">
               <button onClick={async () => {
                  const userDoc = await getDoc(doc(db, 'users', tempUserId));
                  finalizeLogin({ id: tempUserId, ...userDoc.data() });
               }} className="text-[#0a2540] font-black uppercase text-xs hover:underline flex items-center justify-center gap-2 mx-auto">
                 Ignorar e entrar na conta <ArrowRight size={16} />
               </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0a2540] rounded-[32px] mb-6 shadow-2xl transform -rotate-6">
            <Zap className="text-[#00d66f]" size={40} fill="#00d66f" />
          </div>
          <h1 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none mb-2">Vizinho<span className="text-[#00d66f]">Plus</span></h1>
        </div>

        <div className="bg-white rounded-[48px] p-8 md:p-10 shadow-2xl border-4 border-slate-100">
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic mb-8 flex items-center gap-3"><LogIn className="text-[#00d66f]" size={28} /> Entrar</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="O teu email" />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="A tua password" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl">
              {loading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-50 space-y-4 text-center">
            {/* Lógica de redirecionamento do ponto 1 corrigida */}
            <Link 
              to="/register" 
              onClick={(e) => { if(onRegister) { e.preventDefault(); onRegister(); } }}
              className="block text-[#0a2540] font-black uppercase italic text-xs hover:text-[#00d66f]"
            >
              Criar conta Vizinho (Cliente) <ArrowRight className="inline ml-1" size={14} />
            </Link>
            <button onClick={() => setShowMerchantModal(true)} className="w-full p-4 bg-[#00d66f]/10 text-[#0a2540] rounded-2xl font-black uppercase italic text-[10px] border-2 border-[#00d66f]/20 hover:bg-[#00d66f] transition-all">Sou Lojista / Quero Aderir</button>
          </div>
        </div>
      </div>

      {showMerchantModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in my-8">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><Store className="text-[#00d66f]" size={24} /><h2 className="font-black uppercase italic tracking-tighter text-xl">Aderir ao Vizinho+</h2></div>
              <button onClick={() => setShowMerchantModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleMerchantRequest} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Nome da Loja" className="p-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-sm" value={merchantData.shopName} onChange={e => setMerchantData({...merchantData, shopName: e.target.value})} />
                <input required placeholder="Nome Responsável" className="p-4 bg-slate-50 border-2 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-sm" value={merchantData.responsibleName} onChange={e => setMerchantData({...merchantData, responsibleName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="email" placeholder="Email Comercial" className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.email} onChange={e => setMerchantData({...merchantData, email: e.target.value})} />
                <input required placeholder="Telemóvel" className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.phone} onChange={e => setMerchantData({...merchantData, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="NIF" maxLength={9} className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.nif} onChange={e => setMerchantData({...merchantData, nif: e.target.value.replace(/\D/g, '')})} />
                <select required className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.category} onChange={e => setMerchantData({...merchantData, category: e.target.value})}>
                  <option value="">Setor de Atividade...</option>
                  {MERCH_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Freguesia" className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.freguesia} onChange={e => setMerchantData({...merchantData, freguesia: e.target.value})} />
                <input required placeholder="C. Postal" className="p-4 bg-slate-50 border-2 rounded-2xl font-bold text-sm" value={merchantData.zipCode} onChange={e => setMerchantData({...merchantData, zipCode: e.target.value})} />
              </div>
              <button disabled={submittingMerchant} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 border-b-4 border-[#0a2540]">
                {submittingMerchant ? <Loader2 className="animate-spin" /> : 'Enviar Pedido de Adesão'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;