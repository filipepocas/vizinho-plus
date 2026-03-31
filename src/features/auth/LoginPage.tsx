import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Loader2, Store, X, User, Phone, MapPin, Hash, Tag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  
  // Modal de Comerciante
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [merchantData, setMerchantData] = useState({
    shopName: '', responsibleName: '', nif: '', email: '', phone: '', category: '', zipCode: '', freguesia: '', pass: ''
  });
  const [submittingMerchant, setSubmittingMerchant] = useState(false);

  const { currentUser, isInitialized } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, isInitialized, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localLoading) return;
    setLocalLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setLocalLoading(false);
      setError('Email ou password incorretos.');
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
      toast.success('Pedido enviado! Aguarde contacto da nossa equipa.');
      setShowMerchantModal(false);
      setMerchantData({ shopName: '', responsibleName: '', nif: '', email: '', phone: '', category: '', zipCode: '', freguesia: '', pass: '' });
    } catch (err) {
      toast.error('Erro ao enviar pedido. Tente novamente.');
    } finally {
      setSubmittingMerchant(false);
    }
  };

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

        {/* LINKS FALTANTES ADICIONADOS AQUI */}
        <div className="mt-8 flex flex-col items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Link to="/register" className="text-[#00d66f] hover:text-[#00b05b] bg-[#00d66f]/10 px-6 py-3 rounded-xl w-full text-center border border-[#00d66f]/20">Criar Nova Conta (Cliente)</Link>
            <Link to="/forgot-password" className="hover:text-[#0a2540] underline">Esqueci-me da Password</Link>
            <button onClick={() => setShowMerchantModal(true)} className="hover:text-[#0a2540] underline text-blue-500">Sou Comerciante / Quero Aderir</button>
            <Link to="/terms" className="hover:text-[#0a2540] mt-4">Termos e Condições</Link>
        </div>
      </div>

      {/* MODAL DE PEDIDO DE COMERCIANTE */}
      {showMerchantModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
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
                    <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" placeholder="Ex: Restauração, Moda..." value={merchantData.category} onChange={e => setMerchantData({...merchantData, category: e.target.value})} />
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
                  <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Cód. Postal</label>
                  <input required maxLength={8} placeholder="0000-000" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.zipCode} onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 4) val = val.substring(0, 4) + '-' + val.substring(4, 7);
                      setMerchantData({...merchantData, zipCode: val});
                  }} />
                </div>
              </div>
              
              <div>
                 <label className="block text-[10px] font-black uppercase mb-1 text-slate-400">Defina uma Password de Acesso</label>
                 <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input required type="password" minLength={6} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={merchantData.pass} onChange={e => setMerchantData({...merchantData, pass: e.target.value})} />
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