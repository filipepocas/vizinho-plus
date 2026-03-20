import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, provisionAuth } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Clock,
  Percent,
  Activity,
  Wallet,
  ExternalLink,
  Star,
  Database
} from 'lucide-react';
import { SystemConfig } from '../../types';

const AdminSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, setCurrentUser } = useStore();
  
  // ESTADO DE NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState<'security' | 'system'>('security');

  // SEGURANÇA (PERFIL ADMIN)
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // CRIAÇÃO DE NOVOS ADMINS
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  // CONFIGURAÇÃO MASTER
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    globalServiceFee: 0,
    maturationHours: 48, // Mantido no DB por compatibilidade, mas ignorado pela nova lógica mensal
    minRedeemAmount: 5.00,
    platformStatus: 'active',
    supportEmail: 'ajuda@vizinho-plus.pt',
    vantagensUrl: '' 
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isSuperAdmin = (currentUser?.email || '').toLowerCase().trim() === 'rochap.filipe@gmail.com';

  // CARREGAMENTO DAS CONFIGURAÇÕES
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemConfig;
          setSysConfig({
            ...data,
            supportEmail: data.supportEmail || 'ajuda@vizinho-plus.pt'
          });
        }
      } catch (e) {
        console.error("Erro ao carregar configurações:", e);
      }
    };
    fetchConfig();
  }, []);

  // ATUALIZAR CREDENCIAIS
  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As passwords não coincidem!' });
      return;
    }
    
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const adminRef = doc(db, 'users', currentUser?.id || 'admin');
      await setDoc(adminRef, {
        email: newEmail.toLowerCase().trim(),
        updatedAt: serverTimestamp(),
        auditRef: "seguranca_admin_update"
      }, { merge: true });

      if (currentUser) {
        setCurrentUser({ ...currentUser, email: newEmail });
      }
      
      setMessage({ type: 'success', text: 'Credenciais de Admin atualizadas!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar base de dados.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ATUALIZAR SISTEMA
  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      await setDoc(doc(db, 'system', 'config'), {
        ...sysConfig,
        updatedAt: serverTimestamp(),
        lastChangeBy: currentUser?.id || 'admin',
        auditRef: "config_sistema_mensal"
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Configurações aplicadas ao ecossistema!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Falha ao gravar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const email = newAdminEmail.toLowerCase().trim();
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, email, newAdminPassword);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email,
        role: 'admin',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id || 'superadmin',
      }, { merge: true });

      setMessage({ type: 'success', text: 'Novo administrador criado!' });
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Erro ao criar conta de admin.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-4xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="bg-white p-5 rounded-2xl border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                Definições <span className="text-[#00d66f]">Master</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                <Database size={12} /> Ref: sistema_vizinho_plus_2026
              </p>
            </div>
          </div>

          <div className="flex bg-[#0a2540] border-4 border-[#0a2540] p-1 rounded-3xl shadow-[6px_6px_0px_0px_#00d66f]">
            <button 
              onClick={() => setActiveTab('security')}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'security' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'
              }`}
            >
              Segurança
            </button>
            <button 
              onClick={() => setActiveTab('system')}
              className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'system' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'
              }`}
            >
              Sistema
            </button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-8 p-8 rounded-3xl border-4 font-black text-[11px] uppercase flex items-center gap-4 animate-in zoom-in-95 ${
            message.type === 'success' ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' : 'bg-red-50 text-red-600 border-red-500'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            {message.text}
          </div>
        )}

        {/* ABA SEGURANÇA */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <ShieldCheck size={280} className="text-[#0a2540]" />
            </div>
            
            <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-10">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  <Mail size={16} className="text-[#0a2540]" /> E-mail de Administrador
                </label>
                <input 
                  type="email" 
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Lock size={16} className="text-[#0a2540]" /> Nova Password
                  </label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Vazio para manter"
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black"
                  />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Lock size={16} className="text-[#0a2540]" /> Confirmar Password
                  </label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black"
                  />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#0a2540] text-white p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl">
                <Save size={20} /> Atualizar Credenciais
              </button>
            </form>

            {isSuperAdmin && (
              <div className="relative z-10 mt-10 pt-10 border-t-2 border-slate-100">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-6">Criar Novo Administrador</h3>
                <form onSubmit={handleCreateAdmin} className="space-y-6">
                  <input type="email" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black" placeholder="admin@exemplo.pt" />
                  <input type="password" required value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black" placeholder="Password Inicial" minLength={6} />
                  <button type="submit" disabled={isSaving} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-[#00c265] border-b-8 border-black/10">Criar Admin</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ABA SISTEMA */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12 animate-in fade-in">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Mail size={16} className="text-[#00d66f]" /> E-mail Suporte Vizinho+
                  </label>
                  <input type="email" value={sysConfig.supportEmail} onChange={e => setSysConfig({...sysConfig, supportEmail: e.target.value})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black" />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Activity size={16} className="text-amber-500" /> Estado da Plataforma
                  </label>
                  <select value={sysConfig.platformStatus} onChange={e => setSysConfig({...sysConfig, platformStatus: e.target.value as any})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-[10px] uppercase">
                    <option value="active">🟢 OPERACIONAL (LIVE)</option>
                    <option value="maintenance">🟠 MANUTENÇÃO (RESTRICTED)</option>
                  </select>
                </div>
              </div>

              {/* REGRA DE MATURAÇÃO - VISUAL APENAS */}
              <div className="space-y-4 bg-blue-50 p-8 rounded-[40px] border-4 border-blue-100">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-700 ml-1">
                  <Clock size={16} className="text-blue-500" /> Regra de Maturação de Cashback
                </label>
                <div className="bg-white p-6 rounded-3xl border-2 border-blue-200">
                  <p className="text-sm font-black text-[#0a2540] uppercase italic">Calendário Mensal (Mês Seguinte)</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-relaxed italic">
                    * O cashback acumulado num mês só fica disponível no dia 1 do mês seguinte, após o processamento manual no Dashboard Principal.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-amber-50 p-8 rounded-[40px] border-4 border-amber-200">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">
                  <Star size={16} className="text-amber-500 fill-amber-500" /> Link "Vantagens+"
                </label>
                <div className="relative">
                  <input type="url" placeholder="https://..." value={sysConfig.vantagensUrl} onChange={e => setSysConfig({...sysConfig, vantagensUrl: e.target.value})} className="w-full p-6 bg-white border-4 border-amber-300 rounded-3xl font-black" />
                  <ExternalLink className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400" size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Percent size={16} className="text-[#00d66f]" /> Taxa de Serviço Global (%)
                  </label>
                  <input type="number" step="0.1" value={sysConfig.globalServiceFee} onChange={e => setSysConfig({...sysConfig, globalServiceFee: Number(e.target.value)})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl" />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Wallet size={16} className="text-[#00d66f]" /> Levantamento Mínimo (€)
                  </label>
                  <input type="number" step="1" value={sysConfig.minRedeemAmount} onChange={e => setSysConfig({...sysConfig, minRedeemAmount: Number(e.target.value)})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black text-2xl" />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#00d66f] text-[#0a2540] p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-[#00c265] transition-all shadow-xl border-b-8 border-black/10">
                <Save size={20} /> Gravar Configurações Master
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;