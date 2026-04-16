import React, { useState, useEffect } from 'react';
import { User as UserProfile } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { CheckCircle2, XCircle, Globe, Mail } from 'lucide-react';

interface MerchantSettingsProps {
  currentUser: UserProfile;
}

const MerchantSettings: React.FC<MerchantSettingsProps> = ({ currentUser }) => {
  const [cashbackPercent, setCashbackPercent] = useState<string>(currentUser.cashbackPercent?.toString() || '0');
  const [websiteUrl, setWebsiteUrl] = useState<string>(currentUser.websiteUrl || '');
  const [publicEmail, setPublicEmail] = useState<string>(currentUser.publicEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setCashbackPercent(currentUser.cashbackPercent?.toString() || '0');
    setWebsiteUrl(currentUser.websiteUrl || '');
    setPublicEmail(currentUser.publicEmail || '');
  }, [currentUser]);

  const handleSaveData = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const percent = parseFloat(cashbackPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        setMessage({ type: 'error', text: 'Insira um valor de cashback válido entre 0 e 100.' });
        return;
      }

      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, {
        cashbackPercent: percent,
        websiteUrl: websiteUrl.trim(),
        publicEmail: publicEmail.trim()
      });

      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao atualizar dados. Tente novamente.' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  return (
    <div className="bg-white rounded-[40px] shadow-[12px_12px_0px_#0a2540] border-4 border-[#0a2540] p-8 md:p-12 mb-8 animate-in fade-in">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8">Definições da Loja</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Percentagem de Cashback (%)</label>
            <input
              type="number"
              className="w-full p-4 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
              value={cashbackPercent} onChange={(e) => setCashbackPercent(e.target.value)}
              min="0" max="100" step="0.1" disabled={isLoading}
            />
          </div>

          <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Website da Loja (Opcional)</label>
                <div className="relative">
                    <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="url" placeholder="https://"
                      className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-bold text-sm text-[#0a2540]"
                      value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={isLoading}
                    />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Email para Clientes (Opcional)</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="email" placeholder="loja@email.com"
                      className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-bold text-sm text-[#0a2540]"
                      value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} disabled={isLoading}
                    />
                </div>
              </div>
          </div>
      </div>

      <button
        onClick={handleSaveData}
        disabled={isLoading}
        className="w-full bg-[#00d66f] text-[#0a2540] font-black uppercase text-xs py-6 rounded-3xl shadow-xl hover:bg-[#00c263] border-b-4 border-[#0a2540] transition-all disabled:opacity-50 flex justify-center"
      >
        {isLoading ? 'A Guardar...' : 'Guardar Alterações da Loja'}
      </button>

      {message.text && (
        <div className={`mt-8 p-5 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-in zoom-in border-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default MerchantSettings;