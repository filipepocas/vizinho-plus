import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  Activity
} from 'lucide-react';

const AdminSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, setCurrentUser } = useStore();
  
  // Estado para Abas (Segurança vs Sistema)
  const [activeTab, setActiveTab] = useState<'security' | 'system'>('security');

  // Estados de Segurança (Teu Código Original)
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Estados de Configuração de Sistema (Nova Funcionalidade)
  const [sysConfig, setSysConfig] = useState({
    globalServiceFee: 0,
    maturationHours: 48,
    minRedeemAmount: 5.00,
    platformStatus: 'active'
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
          setSysConfig(docSnap.data() as any);
        }
      } catch (e) {
        console.error("Erro ao carregar sistema:", e);
      }
    };
    fetchConfig();
  }, []);

  // Lógica de Atualização de Admin (Teu Código Original Mantido)
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

  // Lógica de Atualização de Sistema
  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'system', 'config'), sysConfig, { merge: true });
      setMessage({ type: 'success', text: 'Configurações de sistema aplicadas!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="group bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0a2540] hover:text-white transition-all active:scale-90"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h2 className="text-3xl font-black text-[#0a2540] uppercase italic tracking-tighter">
                Definições <span className="text-[#00d66f]">Admin</span>
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Painel de Controlo de Infraestrutura</p>
            </div>
          </div>

          {/* NAVEGAÇÃO ENTRE ABAS */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-white text-[#0a2540] shadow-sm' : 'text-slate-400'}`}
            >
              Segurança
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-white text-[#0a2540] shadow-sm' : 'text-slate-400'}`}
            >
              Sistema
            </button>
          </div>
        </div>

        {/* MENSAGENS DE FEEDBACK */}
        {message.text && (
          <div className={`mb-8 p-5 rounded-[24px] font-black text-xs uppercase flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-600 border-2 border-green-100' : 'bg-red-50 text-red-600 border-2 border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* CONTEÚDO DA ABA SEGURANÇA (TEU CÓDIGO) */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-100 p-8 md:p-12 relative overflow-hidden animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <ShieldCheck size={200} className="text-[#0a2540]" />
            </div>
            <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  <Mail size={14} /> E-mail de Administrador
                </label>
                <input 
                  type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] font-black text-[#0a2540]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Lock size={14} /> Nova Password
                  </label>
                  <input 
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Manter atual..."
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] font-black text-[#0a2540] placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Lock size={14} /> Confirmar
                  </label>
                  <input 
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] font-black text-[#0a2540]"
                  />
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-[#0a2540] text-white p-6 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-4">
                {isSaving ? "A Processar..." : <><Save size={20} /> Atualizar Credenciais</>}
              </button>
            </form>
          </div>
        )}

        {/* CONTEÚDO DA ABA SISTEMA (NOVA FUNCIONALIDADE) */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] shadow-xl border-2 border-slate-100 p-8 md:p-12 animate-in fade-in duration-500">
            <form onSubmit={handleUpdateSystem} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Percent size={14} className="text-[#00d66f]" /> Taxa de Serviço (%)
                  </label>
                  <input 
                    type="number" step="0.1" value={sysConfig.globalServiceFee}
                    onChange={e => setSysConfig({...sysConfig, globalServiceFee: Number(e.target.value)})}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Clock size={14} className="text-[#00d66f]" /> Maturação (Horas)
                  </label>
                  <input 
                    type="number" value={sysConfig.maturationHours}
                    onChange={e => setSysConfig({...sysConfig, maturationHours: Number(e.target.value)})}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                  />
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                    <Activity size={14} className="text-amber-500" /> Estado da Rede
                  </label>
                  <select 
                    value={sysConfig.platformStatus}
                    onChange={e => setSysConfig({...sysConfig, platformStatus: e.target.value})}
                    className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-xs uppercase"
                  >
                    <option value="active">Operacional (Live)</option>
                    <option value="maintenance">Em Manutenção</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-[#00c265] transition-all shadow-xl flex items-center justify-center gap-4">
                {isSaving ? "A Guardar..." : <><Settings size={20} /> Guardar Configurações de Sistema</>}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminSettings;