import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

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
      // Guardamos as definições numa pasta central de configurações no Firebase
      const adminRef = doc(db, 'settings', 'admin_profile');
      
      const updateData = {
        email: newEmail.toLowerCase().trim(),
        updatedAt: new Date()
      };

      if (newPassword) {
        // @ts-ignore
        updateData.password = newPassword;
      }

      await setDoc(adminRef, updateData, { merge: true });

      // Atualiza o estado local para o Filipe não ser deslogado
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          email: newEmail
        });
      }

      setMessage({ type: 'success', text: 'Definições atualizadas com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Erro ao guardar no Firebase.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="bg-slate-100 hover:bg-slate-200 p-3 rounded-2xl transition-all"
        >
          ⬅️ Voltar
        </button>
        <h2 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">
          Definições de Segurança
        </h2>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <img src="/logo-vizinho.png" alt="" className="w-24 h-24" />
        </div>

        <form onSubmit={handleUpdateAdmin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">E-mail de Administrador</label>
            <input 
              type="email" 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-[#0a2540]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Nova Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Deixar vazio para manter"
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-[#0a2540]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Confirmar Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#00d66f] font-bold text-[#0a2540]"
              />
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-2xl font-black text-xs uppercase ${message.type === 'success' ? 'bg-green-50 text-green-600 border-2 border-green-100' : 'bg-red-50 text-red-600 border-2 border-red-100'}`}>
              {message.type === 'success' ? '✅' : '⚠️'} {message.text}
            </div>
          )}

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full bg-[#0a2540] text-white p-5 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSaving ? 'A GUARDAR...' : 'ATUALIZAR CREDENCIAIS ➔'}
          </button>
        </form>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-[32px] border-2 border-blue-100">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Nota Importante</p>
        <p className="text-xs text-blue-900 font-bold leading-relaxed">
          Ao alterar estas definições, os valores no código serão ignorados e passaremos a validar o teu acesso através da base de dados segura. Guarda estas credenciais num local seguro.
        </p>
      </div>
    </div>
  );
};

export default AdminSettings;