import React, { useState, useEffect } from 'react';
import { User as UserProfile } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MerchantSettingsProps {
  currentUser: UserProfile;
}

const MerchantSettings: React.FC<MerchantSettingsProps> = ({ currentUser }) => {
  const [cashbackPercent, setCashbackPercent] = useState<string>(currentUser.cashbackPercent?.toString() || '0');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    setCashbackPercent(currentUser.cashbackPercent?.toString() || '0');
  }, [currentUser.cashbackPercent]);

  const handleSaveCashback = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const percent = parseFloat(cashbackPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        setMessage({ type: 'error', text: 'Por favor, insira um valor de cashback válido entre 0 e 100.' });
        return;
      }

      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, {
        cashbackPercent: percent,
      });

      setMessage({ type: 'success', text: 'Cashback atualizado com sucesso!' });
    } catch (e) {
      console.error("Erro ao atualizar o cashback: ", e);
      setMessage({ type: 'error', text: 'Erro ao atualizar o cashback. Tente novamente.' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  return (
    <div className="bg-white rounded-[40px] shadow-2xl p-8 mb-8 border-b-8 border-[#00d66f]">
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0f172a] mb-6">Definições da Loja</h2>

      <div className="mb-6">
        <label htmlFor="cashback" className="block text-sm font-bold text-gray-700 mb-2">Percentagem de Cashback (%)</label>
        <input
          type="number"
          id="cashback"
          className="w-full p-4 rounded-2xl bg-gray-100 border-2 border-gray-200 focus:outline-none focus:border-[#00d66f] font-bold text-lg text-[#0f172a]"
          value={cashbackPercent}
          onChange={(e) => setCashbackPercent(e.target.value)}
          min="0"
          max="100"
          step="0.1"
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleSaveCashback}
        disabled={isLoading}
        className="w-full bg-[#00d66f] text-[#0f172a] font-black uppercase text-[15px] py-4 rounded-2xl shadow-lg hover:bg-[#00c263] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'A Guardar...' : 'Guardar Alterações'}
      </button>

      {message.text && (
        <div className={`mt-8 p-5 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-bounce shadow-xl border-b-4 ${message.type === 'success' ? 'bg-green-500 text-white border-green-700' : 'bg-red-500 text-white border-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {message.text}
        </div>
      )}
    </div>
  );
};

export default MerchantSettings;