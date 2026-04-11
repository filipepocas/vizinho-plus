// src/features/auth/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Loader2, Store, X, User, Phone, MapPin, Hash, Tag, Percent, CheckCircle2, AlertTriangle, Smartphone, Volume2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';
import { registerDeviceInFirebase, requestNotificationPermission } from '../../utils/notifications';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const MERCH_CATEGORIES = [
  "Restauração & Bebidas", "Mercearias & Supermercados", "Talhos & Peixarias",
  "Padarias & Pastelarias", "Moda & Acessórios", "Saúde & Farmácias",
  "Beleza & Cabeleireiros", "Oficinas & Automóveis", "Construção & Bricolage",
  "Artigos para Casa & Decoração", "Papelarias & Livrarias", "Floristas & Jardinagem",
  "Petshops & Veterinários", "Tecnologia & Informática", "Desporto & Lazer",
  "Ópticas", "Ourivesarias & Relojoarias", "Lavandarias & Engomadoria",
  "Sapateiros & Reparações", "Educação & Centros de Explicações", "Outros"
];

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [merchantData, setMerchantData] = useState({
    shopName: '', responsibleName: '', nif: '', email: '', phone: '', category: '', cashbackPercent: '5', zipCode: '', freguesia: '', pass: ''
  });
  const [submittingMerchant, setSubmittingMerchant] = useState(false);

  // Novos Estados para o Controlo Pós-Login
  const { isInstallable, installApp } = usePWAInstall();
  const [setupStep, setSetupStep] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState('');

  const { currentUser, isInitialized } = useStore();
  const navigate = useNavigate();

  // Apenas redireciona se não estivermos presos no "setupStep"
  useEffect(() => {
    if (isInitialized && currentUser && !setupStep && !localLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isInitialized, navigate, setupStep, localLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localLoading) return;
    setLocalLoading(true);
    setError('');
    
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Regista o Equipamento (Máx 2, Limpa aos 45 dias)
      await registerDeviceInFirebase(cred.user.uid);
      setLoggedInUserId(cred.user.uid);

      // Verifica se a permissão nativa de notificações está concedida
      const nativePermission = 'Notification' in window && Notification.permission === 'granted';
      
      if (isInstallable || !nativePermission) {
        setSetupStep(true);
        setLocalLoading(false);
      } else {
        // Deixa o useEffect atuar naturalmente e navegar
      }
    } catch (err: any) {
      setLocalLoading(false);
      setError('Email ou password incorretos.');
    }
  };

  const handleMerchantRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantData.category) {
      toast.error('Por favor, selecione um setor de atividade.');
      return;
    }

    setSubmittingMerchant(true);
    try {
      await addDoc(collection(db, 'merchant_requests'), {
        ...merchantData,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Pedido enviado! Aguarde contacto da nossa equipa.');
      setShowMerchantModal(false);
      setMerchantData({ shopName: '', responsibleName: '', nif: '', email: '', phone: '', category: '', cashbackPercent: '5', zipCode: '', freguesia: '', pass: '' });
    } catch (err) {
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setSubmittingMerchant(false);
    }
  };

  // ECRÃ OBRIGATÓRIO SE A APP NÃO ESTIVER INSTALADA OU SEM NOTIFICAÇÕES
  if (setupStep) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 text-center animate-in zoom-in duration-500">
            <div className="bg-[#00d66f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0a2540]">
              <CheckCircle2 size={40} className="text-[#0a2540]" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Quase lá!</h2>
            
            <div className="bg-amber-50 border-2 border-amber-200 p-5 rounded-3xl mb-8 mt-6 text-left shadow-inner">
               <div className="flex items-center gap-2 mb-2 text-amber-600">
                  <AlertTriangle size={20} strokeWidth={3} />
                  <h3 className="font-black uppercase text-[10px] tracking-widest">Ação Necessária</h3>
               </div>
               <p className="text-xs font-bold text-amber-900 leading-relaxed">
                 Detetámos que este telemóvel não tem a APP instalada ou as Notificações ativas. Para usares a tua conta, por favor, conclui estes passos obrigatórios.
               </p>
            </div>

            <div className="space-y-4 mb-8">
                {isInstallable && (
                    <button onClick={installApp} className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-lg border-2 border-[#0a2540]">
                        <Smartphone size={24} className="text-[#00d66f]" /> Instalar App (Obrigatório)
                    </button>
                )}
                <button onClick={() => requestNotificationPermission(loggedInUserId)} className="w-full bg-[#00d66f] text-[#0a2540] border-2 border-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[4px_4px_0px_#0a2540]">
                    <Volume2 size={24} /> Ativar Notificações
                </button>
            </div>

            <div className="border-t-2 border-slate-100 pt-6 mt-4">
              <button onClick={() => navigate('/dashboard', { replace: true })} className="w-full bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  Já fiz isto, quero entrar <ArrowRight size={20} />
              </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-md bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] p-8 md:p-12 relative">
        <div className="text-center mb-10">
          <div className="bg-[#00d66f] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border-4 border-[#0a2540] rotate-3">
            <LogIn size={32} className="text-[#0a2540]" />
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540]">Vizinho+</h2>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="teu@email.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-bold" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" disabled={localLoading} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase italic tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl border-b-8 border-black/20">
            {localLoading ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight /></>}
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Link to="/register" className="text-[#00d66f] hover:text-[#00b05b] bg-[#00d66f]/10 px-6 py-3 rounded-xl w-full text-center border border-[#00d66f]/20">Criar Nova Conta (Cliente)</Link>
            <Link to="/forgot-password" className="hover:text-[#0a2540] underline">Esqueci-me da Password</Link>
            <button onClick={() => setShowMerchantModal(true)} className="hover:text-[#0a2540] underline text-blue-500">Sou Comerciante / Quero Aderir</button>
            <Link to="/terms" className="hover:text-[#0a2540] mt-4">Termos e Condições</Link>
        </div>
      </div>

      {showMerchantModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
          {/* O RESTO DO TEU CÓDIGO DO MODAL DE COMERCIANTES FICOU INTACTO ABAIXO */}
          <div className="bg-white w-full max-w-xl rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in duration-300 my-8">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Store className="text-[#00d66f]" size={24} />
                <h2 className="font-black uppercase italic tracking-tighter text-xl">Aderir ao Vizinho+</h2>
              </div>
              <button onClick={() => setShowMerchantModal(false)} className="hover:rotate-90 transition-transform">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleMerchantRequest} className="p-8 space-y-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Preencha os dados da sua loja. A nossa equipa irá validar o pedido e ativar a sua conta.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Nome da Loja</label>
                  <div className="relative">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.shopName} onChange={e => setMerchantData({...merchantData, shopName: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Nome do Responsável</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.responsibleName} onChange={e => setMerchantData({...merchantData, responsibleName: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Email (Para Login)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="email" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.email} onChange={e => setMerchantData({...merchantData, email: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Telefone / Tlm</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="tel" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.phone} onChange={e => setMerchantData({...merchantData, phone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">NIF Comercial</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required maxLength={9} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.nif} onChange={e => setMerchantData({...merchantData, nif: e.target.value.replace(/\D/g, '')})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Setor / Categoria</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <select required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm appearance-none" value={merchantData.category} onChange={e => setMerchantData({...merchantData, category: e.target.value})}>
                      <option value="">SELECIONE O SETOR...</option>
                      {MERCH_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Freguesia</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.freguesia} onChange={e => setMerchantData({...merchantData, freguesia: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Código Postal</label>
                  <input required maxLength={8} placeholder="0000-000" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.zipCode} onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
                      setMerchantData({...merchantData, zipCode: val});
                  }} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Defina uma Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input required type="password" minLength={6} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.pass} onChange={e => setMerchantData({...merchantData, pass: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">% Cashback Pretendido</label>
                    <div className="relative">
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input required type="number" min="0" max="100" step="0.1" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.cashbackPercent} onChange={e => setMerchantData({...merchantData, cashbackPercent: e.target.value})} />
                    </div>
                  </div>
              </div>

              <button disabled={submittingMerchant} type="submit" className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center justify-center gap-3 border-b-4 border-[#0a2540] mt-4">
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