import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Settings,
  Clock,
  Percent,
  Activity,
  Wallet,
  ExternalLink,
  Star
} from 'lucide-react';

const AdminSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, setCurrentUser } = useStore();
  
  // Estado para Abas (Segurança vs Sistema)
  const [activeTab, setActiveTab] = useState<'security' | 'system'>('security');

  // Estados de Segurança
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados de Configuração de Sistema
  const [sysConfig, setSysConfig] = useState({
    globalServiceFee: 0,
    maturationHours: 48,
    minRedeemAmount: 5.00,
    platformStatus: 'active',
    supportEmail: 'ajuda@vizinho-plus.pt',
    vantagensUrl: '' 
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Carregar Configurações de Sistema ao montar
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSysConfig({
            globalServiceFee: data.globalServiceFee || 0,
            maturationHours: data.maturationHours || 48,
            minRedeemAmount: data.minRedeemAmount || 5.00,
            platformStatus: data.platformStatus || 'active',
            supportEmail: data.supportEmail || 'ajuda@vizinho-plus.pt',
            vantagensUrl: data.vantagensUrl || ''
          });
        }
      } catch (e) {
        console.error("Erro ao carregar sistema:", e);
      }
    };
    fetchConfig();
  }, []);

  // Lógica de Atualização de Admin (Segurança)
  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As passwords não coincidem!' });
      return;
    }
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const adminRef = doc(db, 'settings', 'admin_profile');
      const updateData: any = {
        email: newEmail.toLowerCase().trim(),
        updatedAt: serverTimestamp()
      };
      if (newPassword) updateData.password = newPassword;

      await setDoc(adminRef, updateData, { merge: true });

      if (currentUser) {
        setCurrentUser({ ...currentUser, email: newEmail });
      }
      setMessage({ type: 'success', text: 'Credenciais atualizadas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro crítico ao guardar no Firebase.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Lógica de Atualização de Sistema (Campos de Suporte e Vantagens incluídos aqui)
  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      // Grava na coleção centralizada que a app e o dashboard consultam
      await setDoc(doc(db, 'system', 'config'), {
        ...sysConfig,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Configurações Master aplicadas!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="bg-white p-5 rounded-2xl border-2 border-[#0a2540] shadow-[4px_4px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
            >
              <ArrowLeft size={24} className="text-[#0a2540]" />
            </button>
            <div>
              <h2 className="text-4xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none">
                Definições <span className="text-[#00d66f]">Admin</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Core System Configuration</p>
            </div>
          </div>

          {/* SELETOR DE ABAS */}
          <div className="flex bg-white border-2 border-[#0a2540] p-1 rounded-2xl shadow-[4px_4px_0px_0px_#0a2540]">
            <button 
              onClick={() => setActiveTab('security')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-[#0a2540] text-white' : 'text-[#0a2540] hover:bg-slate-50'}`}
            >
              Segurança
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-[#0a2540] text-white' : 'text-[#0a2540] hover:bg-slate-50'}`}
            >
              Sistema
            </button>
          </div>
        </div>

        {/* MENSAGENS DE FEEDBACK */}
        {message.text && (
          <div className={`mb-8 p-6 rounded-3xl border-2 font-black text-xs uppercase flex items-center gap-4 animate-in zoom-in-95 duration-300 ${
            message.type === 'success' 
              ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' 
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        )}

        {/* CONTEÚDO DA ABA SEGURANÇA */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] border-2 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] p-8 md:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <ShieldCheck size={280} className="text-[#0a2540]" />
            </div>
            
            <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-10">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                  <Mail size={14} className="text-[#0a2540]" /> E-mail de Administrador
                </label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Lock size={14} className="text-[#0a2540]" /> Nova Password
                  </label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Deixe vazio para manter"
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] placeholder:text-slate-300 transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Lock size={14} className="text-[#0a2540]" /> Confirmar Password
                  </label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-[#0a2540] text-white p-7 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-[0px_10px_20px_-5px_rgba(10,37,64,0.3)] flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isSaving ? "A PROCESSAR..." : <><Save size={20} /> Atualizar Credenciais</>}
              </button>
            </form>
          </div>
        )}

        {/* CONTEÚDO DA ABA SISTEMA */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] border-2 border-[#0a2540] shadow-[8px_8px_0px_0px_#0a2540] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* E-MAIL DE SUPORTE */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Mail size={14} className="text-[#00d66f]" /> E-mail de Suporte Público
                  </label>
                  <input 
                    type="email" 
                    value={sysConfig.supportEmail}
                    onChange={e => setSysConfig({...sysConfig, supportEmail: e.target.value})}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                  />
                </div>

                {/* STATUS DA PLATAFORMA */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Activity size={14} className="text-amber-500" /> Status da Plataforma
                  </label>
                  <select 
                    value={sysConfig.platformStatus}
                    onChange={e => setSysConfig({...sysConfig, platformStatus: e.target.value})}
                    className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-amber-500 focus:bg-white font-black text-[10px] uppercase tracking-widest text-[#0a2540] appearance-none cursor-pointer transition-all"
                  >
                    <option value="active">🟢 Operacional (LIVE)</option>
                    <option value="maintenance">🟠 Em Manutenção (RESTRICTED)</option>
                  </select>
                </div>
              </div>

              {/* URL VANTAGENS+ */}
              <div className="space-y-4 bg-amber-50 p-6 rounded-[32px] border-2 border-amber-200">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-amber-700 ml-1">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Link "Vantagens+" (Botão Dourado)
                </label>
                <div className="relative group">
                  <input 
                    type="url" 
                    placeholder="https://exemplo.com/vantagens"
                    value={sysConfig.vantagensUrl}
                    onChange={e => setSysConfig({...sysConfig, vantagensUrl: e.target.value})}
                    className="w-full p-6 bg-white border-2 border-amber-300 rounded-3xl outline-none focus:border-amber-500 font-black text-[#0a2540] transition-all"
                  />
                  <ExternalLink className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400" size={20} />
                </div>
                <p className="text-[9px] font-bold text-amber-600 uppercase mt-2 px-2 italic">
                  * Este link será aberto quando os clientes clicarem no botão dourado na App.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* TAXA SERVIÇO */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Percent size={14} className="text-[#00d66f]" /> Taxa Serviço
                  </label>
                  <div className="relative">
                    <input 
                      type="number" step="0.1" 
                      value={sysConfig.globalServiceFee}
                      onChange={e => setSysConfig({...sysConfig, globalServiceFee: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#0a2540] opacity-30">%</span>
                  </div>
                </div>

                {/* MATURAÇÃO */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Clock size={14} className="text-[#00d66f]" /> Maturação
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sysConfig.maturationHours}
                      onChange={e => setSysConfig({...sysConfig, maturationHours: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[8px] uppercase text-slate-400">Horas</span>
                  </div>
                </div>

                {/* LEVANTAMENTO MÍNIMO */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 ml-1">
                    <Wallet size={14} className="text-[#00d66f]" /> Mínimo
                  </label>
                  <div className="relative">
                    <input 
                      type="number" step="1"
                      value={sysConfig.minRedeemAmount}
                      onChange={e => setSysConfig({...sysConfig, minRedeemAmount: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[#0a2540] opacity-30">€</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-[#00d66f] text-[#0a2540] p-7 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-[#00c265] transition-all shadow-[0px_10px_20px_-5px_rgba(0,214,111,0.3)] flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isSaving ? "A GUARDAR..." : <><Save size={20} /> Gravar Configurações Master</>}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminSettings;