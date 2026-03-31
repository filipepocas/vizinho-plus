import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ShieldCheck, Mail, Lock, Save, AlertCircle, CheckCircle2, ExternalLink, Star, Database } from 'lucide-react';
import { SystemConfig } from '../../types';

const AdminSettings: React.FC = () => {
  const { currentUser, setCurrentUser } = useStore();
  
  const [activeTab, setActiveTab] = useState<'system' | 'security'>('system');
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [sysConfig, setSysConfig] = useState<SystemConfig>({
    globalServiceFee: 0,
    maturationHours: 0,
    minRedeemAmount: 5.00,
    platformStatus: 'active',
    supportEmail: 'ajuda@vizinho-plus.pt',
    vantagensUrl: '' 
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemConfig;
          setSysConfig({ ...data, supportEmail: data.supportEmail || 'ajuda@vizinho-plus.pt' });
        }
      } catch (e) {
        console.error("Erro:", e);
      }
    };
    fetchConfig();
  }, []);

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
      await setDoc(adminRef, { email: newEmail.toLowerCase().trim(), updatedAt: serverTimestamp() }, { merge: true });
      if (currentUser) setCurrentUser({ ...currentUser, email: newEmail });
      
      setMessage({ type: 'success', text: 'Credenciais atualizadas!' });
      setNewPassword(''); setConfirmPassword('');
    } catch (error) { setMessage({ type: 'error', text: 'Erro ao atualizar.' }); } finally { setIsSaving(false); }
  };

  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      await setDoc(doc(db, 'system', 'config'), { ...sysConfig, updatedAt: serverTimestamp(), lastChangeBy: currentUser?.id || 'admin' }, { merge: true });
      setMessage({ type: 'success', text: 'Configurações globais aplicadas!' });
    } catch (e) { setMessage({ type: 'error', text: 'Falha ao gravar.' }); } finally { setIsSaving(false); }
  };

  return (
    <div className="font-sans text-[#0a2540] animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8">
          <div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Definições <span className="text-[#00d66f]">Master</span></h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3 flex items-center gap-2"><Database size={12} /> Ajustes Globais da Plataforma</p>
          </div>

          <div className="flex bg-[#0a2540] border-4 border-[#0a2540] p-1 rounded-3xl shadow-[6px_6px_0px_0px_#00d66f]">
            <button onClick={() => setActiveTab('system')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'}`}>Plataforma</button>
            <button onClick={() => setActiveTab('security')} className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-[#00d66f] text-[#0a2540]' : 'text-white/60 hover:text-white'}`}>Segurança</button>
          </div>
        </div>

        {message.text && (
          <div className={`mb-8 p-6 rounded-3xl border-4 font-black text-[11px] uppercase flex items-center gap-4 animate-in zoom-in-95 ${message.type === 'success' ? 'bg-[#00d66f]/10 text-[#00d66f] border-[#00d66f]' : 'bg-red-50 text-red-600 border-red-500'}`}>
            {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />} {message.text}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#00d66f] p-8 md:p-12">
            <form onSubmit={handleUpdateSystem} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    <Mail size={16} className="text-[#00d66f]" /> E-mail Apoio ao Cliente (Aparece no Rodapé)
                  </label>
                  <input type="email" value={sysConfig.supportEmail} onChange={e => setSysConfig({...sysConfig, supportEmail: e.target.value})} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-black" />
                </div>

                <div className="space-y-4 bg-amber-50 p-6 rounded-3xl border-4 border-amber-200">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700 ml-1">
                    <Star size={16} className="text-amber-500 fill-amber-500" /> Link para "Vantagens VIP" (App Clientes)
                  </label>
                  <div className="relative">
                    <input type="url" placeholder="https://..." value={sysConfig.vantagensUrl} onChange={e => setSysConfig({...sysConfig, vantagensUrl: e.target.value})} className="w-full p-6 bg-white border-4 border-amber-300 rounded-3xl font-black" />
                    <ExternalLink className="absolute right-6 top-1/2 -translate-y-1/2 text-amber-400" size={24} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#00d66f] text-[#0a2540] p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-[#00c265] transition-all shadow-xl border-b-8 border-black/10">
                <Save size={20} /> Gravar Configurações Globais
              </button>
            </form>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none"><ShieldCheck size={280} className="text-[#0a2540]" /></div>
            
            <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-10">
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Mail size={16} className="text-[#0a2540]" /> E-mail de Administrador</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Lock size={16} className="text-[#0a2540]" /> Nova Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Vazio para manter" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-500 ml-1"><Lock size={16} className="text-[#0a2540]" /> Confirmar Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl outline-none focus:border-[#0a2540] font-black" />
                </div>
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-[#0a2540] text-white p-8 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-4 disabled:opacity-50 shadow-xl"><Save size={20} /> Atualizar Credenciais</button>
            </form>
          </div>
        )}
    </div>
  );
};

export default AdminSettings;