import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { provisionAuth } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
  Star,
  Database
} from 'lucide-react';

const AdminSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, setCurrentUser } = useStore();
  
  // ESTADO DE NAVEGAÇÃO INTERNA
  const [activeTab, setActiveTab] = useState<'security' | 'system'>('security');

  // ESTADOS DE SEGURANÇA (PERFIL ADMIN)
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // CRIAÇÃO DE NOVOS ADMINS (provisionamento sem trocar sessão)
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  
  // ESTADOS DE CONFIGURAÇÃO MASTER (Ponto 11 e 12)
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

  const isSuperAdmin = (currentUser?.email || '').toLowerCase().trim() === 'rochap.filipe@gmail.com';

  // CARREGAMENTO ATÓMICO DAS CONFIGURAÇÕES
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
        console.error("Erro ao carregar configurações de sistema:", e);
      }
    };
    fetchConfig();
  }, []);

  // ATUALIZAÇÃO DE CREDENCIAIS (Ponto 15 - Segurança)
  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As passwords não coincidem!' });
      return;
    }
    
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Atualização no perfil do utilizador (Firestore Auth Metadata)
      const adminRef = doc(db, 'users', currentUser?.id || 'admin');
      const updateData: any = {
        email: newEmail.toLowerCase().trim(),
        updatedAt: serverTimestamp(),
        auditRef: "audit150326_security_update"
      };

      await setDoc(adminRef, updateData, { merge: true });

      if (currentUser) {
        setCurrentUser({ ...currentUser, email: newEmail });
      }
      
      setMessage({ type: 'success', text: 'Credenciais de Admin atualizadas!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Erro ao atualizar Admin:", error);
      setMessage({ type: 'error', text: 'Erro ao comunicar com a base de dados.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ATUALIZAÇÃO DAS REGRAS DE NEGÓCIO (Ponto 5, 8, 11)
  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Gravação centralizada que alimenta ClientDashboard e AdminDashboard
      await setDoc(doc(db, 'system', 'config'), {
        ...sysConfig,
        updatedAt: serverTimestamp(),
        lastChangeBy: currentUser?.id || 'admin',
        auditRef: "audit150326_master_config"
      }, { merge: true });
      
      setMessage({ type: 'success', text: 'Configurações Master aplicadas ao ecossistema!' });
    } catch (e) {
      console.error("Erro ao salvar sistema:", e);
      setMessage({ type: 'error', text: 'Falha ao gravar configurações master.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      setMessage({ type: 'error', text: 'Apenas o Super Admin pode criar novos administradores.' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const email = newAdminEmail.toLowerCase().trim();
      const password = newAdminPassword;
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, email, password);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        email,
        role: 'admin',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser?.id || 'superadmin',
      }, { merge: true });

      setMessage({ type: 'success', text: 'Novo administrador criado com sucesso!' });
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (error: any) {
      console.error("Erro ao criar admin:", error);
      if (error?.code === 'auth/email-already-in-use') {
        setMessage({ type: 'error', text: 'Este e-mail já está em utilização.' });
      } else if (error?.code === 'auth/weak-password') {
        setMessage({ type: 'error', text: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao criar administrador. Verifica os dados.' });
      }
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 font-sans text-[#0a2540]">
      <div className="max-w-4xl mx-auto">
        
        {/* CABEÇALHO BRUTALISTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="bg-white p-5 rounded-2xl border-4 border-[#0a2540] shadow-[6px_6px_0px_0px_#0a2540] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                Definições <span className="text-[#00d66f]">Master</span>
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center gap-2">
                <Database size={12} /> Ref: audit150326_system_control
              </p>
            </div>
          </div>

          {/* SELETOR DE ABAS BRUTALISTA */}
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

        {/* FEEDBACK DE SUCESSO/ERRO */}
        {message.text && (
          <div className={`mb-8 p-8 rounded-3xl border-4 font-black text-[11px] uppercase flex items-center gap-4 animate-in zoom-in-95 duration-300 ${
            message.type === 'success' 
              ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' 
              : 'bg-red-50 text-red-600 border-red-500 shadow-[4px_4px_0px_0px_#ef4444]'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            {message.text}
          </div>
        )}

        {/* CONTEÚDO: ABA SEGURANÇA */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8 md:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
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
                  className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] transition-all"
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
                    placeholder="Deixe vazio para manter"
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] placeholder:text-slate-300 transition-all"
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
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] focus:bg-white font-black text-[#0a2540] transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-[#0a2540] text-white p-8 rounded-3xl font-black text-xs uppercase tracking-[0.25em] hover:bg-black transition-all shadow-[0px_10px_20px_-5px_rgba(10,37,64,0.4)] flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isSaving ? "A PROCESSAR..." : <><Save size={20} /> Atualizar Credenciais</>}
              </button>
            </form>

            {/* CRIAR NOVO ADMIN */}
            <div className="relative z-10 mt-10 pt-10 border-t-2 border-slate-100">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-6">
                Criar Novo Administrador
              </h3>
              {!isSuperAdmin ? (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">
                  Apenas o Super Admin (`rochap.filipe@gmail.com`) pode criar novos administradores.
                </p>
              ) : (
                <form onSubmit={handleCreateAdmin} className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">E-mail do Novo Admin</label>
                    <input
                      type="email"
                      required
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                      placeholder="admin@exemplo.pt"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Password Inicial</label>
                    <input
                      type="password"
                      required
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase tracking-[0.2em] hover:bg-[#00c265] transition-all disabled:opacity-50 border-b-8 border-black/10"
                  >
                    Criar Admin
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* CONTEÚDO: ABA SISTEMA */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Mail size={16} className="text-[#00d66f]" /> E-mail Suporte Vizinho+
                  </label>
                  <input 
                    type="email" 
                    value={sysConfig.supportEmail}
                    onChange={e => setSysConfig({...sysConfig, supportEmail: e.target.value})}
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Activity size={16} className="text-amber-500" /> Estado da Plataforma
                  </label>
                  <select 
                    value={sysConfig.platformStatus}
                    onChange={e => setSysConfig({...sysConfig, platformStatus: e.target.value})}
                    className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-amber-500 focus:bg-white font-black text-[10px] uppercase tracking-[0.2em] text-[#0a2540] appearance-none cursor-pointer transition-all"
                  >
                    <option value="active">🟢 OPERACIONAL (LIVE)</option>
                    <option value="maintenance">🟠 MANUTENÇÃO (RESTRICTED)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 bg-amber-50 p-8 rounded-[40px] border-4 border-amber-200">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">
                  <Star size={16} className="text-amber-500 fill-amber-500" /> Link "Vantagens+" (Botão Dourado)
                </label>
                <div className="relative">
                  <input 
                    type="url" 
                    placeholder="https://exemplo.com/vantagens"
                    value={sysConfig.vantagensUrl}
                    onChange={e => setSysConfig({...sysConfig, vantagensUrl: e.target.value})}
                    className="w-full p-6 bg-white border-4 border-amber-300 rounded-3xl outline-none focus:border-amber-500 font-black text-[#0a2540] transition-all"
                  />
                  <ExternalLink className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400" size={24} />
                </div>
                <p className="text-[9px] font-bold text-amber-600 uppercase mt-2 px-2 italic">
                  * Link externo para o portal de benefícios Vizinho+.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Percent size={16} className="text-[#00d66f]" /> Taxa Global
                  </label>
                  <div className="relative">
                    <input 
                      type="number" step="0.1" 
                      value={sysConfig.globalServiceFee}
                      onChange={e => setSysConfig({...sysConfig, globalServiceFee: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-2xl text-[#0a2540]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-xl opacity-20">%</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Clock size={16} className="text-[#00d66f]" /> Maturação
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sysConfig.maturationHours}
                      onChange={e => setSysConfig({...sysConfig, maturationHours: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-2xl text-[#0a2540]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-[10px] uppercase opacity-40">Hrs</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Wallet size={16} className="text-[#00d66f]" /> Lev. Mínimo
                  </label>
                  <div className="relative">
                    <input 
                      type="number" step="1"
                      value={sysConfig.minRedeemAmount}
                      onChange={e => setSysConfig({...sysConfig, minRedeemAmount: Number(e.target.value)})}
                      className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#00d66f] font-black text-2xl text-[#0a2540]"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-xl opacity-20">€</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-[#00d66f] text-[#0a2540] p-8 rounded-3xl font-black text-xs uppercase tracking-[0.25em] hover:bg-[#00c265] transition-all shadow-[0px_10px_30px_-5px_rgba(0,214,111,0.4)] flex items-center justify-center gap-4 disabled:opacity-50 border-b-8 border-black/10"
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