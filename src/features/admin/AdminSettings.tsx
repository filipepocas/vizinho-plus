import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Save, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const AdminSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, setCurrentUser } = useStore();
  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

      if (newPassword) {
        updateData.password = newPassword;
      }

      await setDoc(adminRef, updateData, { merge: true });

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          email: newEmail
        });
      }

      setMessage({ type: 'success', text: 'Credenciais atualizadas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro crítico ao guardar no Firebase.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f9fc] p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="flex items-center gap-6 mb-10">
          <button 
            onClick={onBack}
            className="group bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0a2540] hover:text-white transition-all active:scale-90"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-[#0a2540] uppercase italic tracking-tighter leading-none">
              Segurança <span className="text-[#00d66f]">Admin</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Gestão de Acesso de Super-User
            </p>
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-white rounded-[40px] shadow-[0_30px_60px_rgba(10,37,64,0.08)] border-2 border-slate-100 relative overflow-hidden p-8 md:p-12">
          
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
            <ShieldCheck size={200} className="text-[#0a2540]" />
          </div>

          <form onSubmit={handleUpdateAdmin} className="relative z-10 space-y-8">
            
            {/* EMAIL */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                <Mail size={14} /> E-mail de Administrador
              </label>
              <input 
                type="email" 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                required
              />
            </div>

            {/* PASSWORDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  <Lock size={14} /> Nova Password
                </label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Manter atual..."
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all placeholder:text-slate-300"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">
                  <Lock size={14} /> Confirmar
                </label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] outline-none focus:border-[#00d66f] focus:bg-white font-black text-[#0a2540] transition-all"
                />
              </div>
            </div>

            {/* FEEDBACK MESSAGES */}
            {message.text && (
              <div className={`p-5 rounded-[24px] font-black text-xs uppercase flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-600 border-2 border-green-100' 
                  : 'bg-red-50 text-red-600 border-2 border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </div>
            )}

            {/* BOTÃO SUBMIT */}
            <button 
              type="submit"
              disabled={isSaving}
              className="group w-full bg-[#0a2540] text-white p-6 rounded-[24px] font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={20} className="group-hover:scale-110 transition-transform" />
                  Atualizar Credenciais
                </>
              )}
            </button>
          </form>
        </div>

        {/* BOX DE AVISO */}
        <div className="mt-10 p-8 bg-blue-50/50 rounded-[32px] border-2 border-blue-100/50 flex gap-5 items-start">
          <div className="bg-blue-100 p-3 rounded-2xl text-blue-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Protocolo de Segurança</p>
            <p className="text-xs text-blue-900/70 font-bold leading-relaxed">
              Estas alterações são aplicadas instantaneamente à base de dados. O sistema passará a exigir estas novas credenciais em todos os futuros acessos ao Painel Admin.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminSettings;