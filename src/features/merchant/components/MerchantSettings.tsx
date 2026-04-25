// src/features/merchant/components/MerchantSettings.tsx

import React, { useState, useEffect } from 'react';
import { User as UserProfile } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../../config/firebase';
import { updatePassword } from 'firebase/auth';
import { CheckCircle2, XCircle, Globe, Mail, Lock, Store, MapPin, Locate, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
// CORREÇÃO: Caminho atualizado para recuar 4 níveis até à pasta utils
import { translateDay } from '../../../utils/timeUtils';

interface MerchantSettingsProps {
  currentUser: UserProfile;
}

const defaultHours = {
  monday: { open: '09:00', close: '19:00', closed: false },
  tuesday: { open: '09:00', close: '19:00', closed: false },
  wednesday: { open: '09:00', close: '19:00', closed: false },
  thursday: { open: '09:00', close: '19:00', closed: false },
  friday: { open: '09:00', close: '19:00', closed: false },
  saturday: { open: '09:00', close: '13:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

const MerchantSettings: React.FC<MerchantSettingsProps> = ({ currentUser }) => {
  const { locations } = useStore();

  const [shopName, setShopName] = useState<string>(currentUser.shopName || currentUser.name || '');
  const [cashbackPercent, setCashbackPercent] = useState<string>(currentUser.cashbackPercent?.toString() || '0');
  const [websiteUrl, setWebsiteUrl] = useState<string>(currentUser.websiteUrl || '');
  const [publicEmail, setPublicEmail] = useState<string>(currentUser.publicEmail || '');
  
  const [distrito, setDistrito] = useState<string>(currentUser.distrito || '');
  const [concelho, setConcelho] = useState<string>(currentUser.concelho || '');
  const [freguesia, setFreguesia] = useState<string>(currentUser.freguesia || '');
  const [address, setAddress] = useState<string>(currentUser.address || '');
  const [zipCode, setZipCode] = useState<string>(currentUser.zipCode || '');

  const [businessHours, setBusinessHours] = useState(currentUser.businessHours || defaultHours);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const distritos = Object.keys(locations || {}).sort();
  const merchantConcelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const merchantFreguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  useEffect(() => {
    setShopName(currentUser.shopName || currentUser.name || '');
    setCashbackPercent(currentUser.cashbackPercent?.toString() || '0');
    setWebsiteUrl(currentUser.websiteUrl || '');
    setPublicEmail(currentUser.publicEmail || '');
    setDistrito(currentUser.distrito || '');
    setConcelho(currentUser.concelho || '');
    setFreguesia(currentUser.freguesia || '');
    setAddress(currentUser.address || '');
    setZipCode(currentUser.zipCode || '');
    if (currentUser.businessHours) setBusinessHours(currentUser.businessHours);
  }, [currentUser]);

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4) + '-' + value.substring(4, 7);
    setZipCode(value);
  };

  const handleHourChange = (day: string, field: 'open' | 'close' | 'closed', value: any) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof prev], [field]: value }
    }));
  };

  const handleSaveData = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const percent = parseFloat(cashbackPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        setMessage({ type: 'error', text: 'Insira um valor de cashback válido entre 0 e 100.' });
        return;
      }
      
      if (!distrito || !concelho || !freguesia) {
        setMessage({ type: 'error', text: 'A localização (Distrito, Concelho e Freguesia) é obrigatória.' });
        return;
      }

      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, {
        shopName: shopName.trim(),
        name: shopName.trim(),
        cashbackPercent: percent,
        websiteUrl: websiteUrl.trim(),
        publicEmail: publicEmail.trim(),
        distrito: distrito,
        concelho: concelho,
        freguesia: freguesia,
        address: address.trim(),
        zipCode: zipCode.trim(),
        businessHours: businessHours
      });

      setMessage({ type: 'success', text: 'Dados atualizados com sucesso!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao atualizar dados. Tente novamente.' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return toast.error("As passwords não coincidem.");
    if (newPass.length < 6) return toast.error("A password tem de ter pelo menos 6 caracteres.");

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        toast.success("Password alterada com sucesso!");
        setNewPass('');
        setConfirmPass('');
      } else {
        toast.error("Erro: Sessão não encontrada.");
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Por segurança, tem de fazer logout e entrar novamente para mudar a password.");
      } else {
        toast.error("Erro ao alterar password.");
      }
    }
  };

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in pb-20">
      
      <div className="bg-white rounded-[40px] shadow-[12px_12px_0px_#0a2540] border-4 border-[#0a2540] p-8 md:p-10 flex flex-col">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8 flex items-center gap-3">
            <Store className="text-[#00d66f]" /> Informações da Loja
        </h2>

        <div className="space-y-6 mb-8 flex-1">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nome Comercial</label>
              <input
                type="text" className="w-full p-4 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-bold text-sm text-[#0a2540]"
                value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Percentagem de Cashback (%)</label>
              <input
                type="number" className="w-full p-4 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-black text-xl text-[#0a2540]"
                value={cashbackPercent} onChange={(e) => setCashbackPercent(e.target.value)} min="0" max="100" step="0.1" disabled={isLoading}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Website (Opcional)</label>
                  <div className="relative">
                      <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="url" placeholder="https://" className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-bold text-xs text-[#0a2540]"
                        value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={isLoading}
                      />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Email P/ Clientes (Opcional)</label>
                  <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email" placeholder="loja@email.com" className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:outline-none focus:border-[#00d66f] font-bold text-xs text-[#0a2540]"
                        value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} disabled={isLoading}
                      />
                  </div>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[24px] border-4 border-slate-100 space-y-4">
                <p className="text-[10px] font-black uppercase text-[#0a2540] flex items-center gap-2 mb-2">
                    <MapPin size={16} className="text-[#00d66f]"/> Localização (Para o Mapa)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f]">
                      <option value="">Distrito</option>
                      {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                   <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                      <option value="">Concelho</option>
                      {merchantConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                      <option value="">Freguesia</option>
                      {merchantFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <div className="md:col-span-2 relative">
                     <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                     <input placeholder="Rua, Número, Andar..." value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-10 p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f]" />
                   </div>
                   <div className="relative">
                     <Locate className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                     <input placeholder="Cód. Postal" value={zipCode} onChange={handleZipCodeChange} className="w-full pl-10 p-3 rounded-xl font-bold text-xs outline-none border-2 border-slate-200 focus:border-[#00d66f]" />
                   </div>
                </div>
            </div>
        </div>

        <button onClick={handleSaveData} disabled={isLoading} className="w-full bg-[#00d66f] text-[#0a2540] font-black uppercase text-sm py-6 rounded-3xl shadow-xl hover:bg-[#00c263] border-b-4 border-[#0a2540] transition-all disabled:opacity-50 mt-auto">
          {isLoading ? 'A Guardar...' : 'Gravar Alterações da Loja'}
        </button>

        {message.text && (
          <div className={`mt-6 p-4 rounded-2xl font-black text-center text-[10px] uppercase flex items-center justify-center gap-3 animate-in zoom-in border-4 ${message.type === 'success' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-[40px] shadow-lg border-4 border-slate-100 p-8 md:p-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-6 flex items-center gap-2"><Clock className="text-amber-500"/> Horário de Funcionamento</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Os clientes verão se a sua loja está aberta ou fechada em tempo real.</p>
          
          <div className="space-y-3">
            {daysOrder.map(day => {
              const hours = businessHours[day as keyof typeof businessHours];
              return (
                <div key={day} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${hours.closed ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-amber-200'}`}>
                  <div className="flex items-center gap-3 w-1/3">
                    <input 
                      type="checkbox" 
                      checked={!hours.closed} 
                      onChange={(e) => handleHourChange(day, 'closed', !e.target.checked)}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-black uppercase text-[#0a2540]">{translateDay(day)}</span>
                  </div>
                  
                  {!hours.closed ? (
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <input type="time" value={hours.open} onChange={(e) => handleHourChange(day, 'open', e.target.value)} className="p-2 border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-amber-500" />
                      <span className="text-slate-300 font-bold">às</span>
                      <input type="time" value={hours.close} onChange={(e) => handleHourChange(day, 'close', e.target.value)} className="p-2 border-2 border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-amber-500" />
                    </div>
                  ) : (
                    <div className="flex-1 text-right text-[10px] font-black uppercase text-red-400">Encerrado</div>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={handleSaveData} disabled={isLoading} className="w-full mt-6 bg-[#0a2540] text-amber-400 font-black uppercase text-xs py-4 rounded-2xl hover:bg-black transition-all border-b-4 border-black/50">Guardar Horários</button>
        </div>

        <div className="bg-white rounded-[40px] shadow-lg border-4 border-slate-100 p-8 md:p-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-8 flex items-center gap-2"><Lock className="text-blue-500"/> Segurança de Acesso</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nova Password</label>
              <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:outline-none focus:border-blue-500 font-bold text-sm" value={newPass} onChange={e=>setNewPass(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Confirmar Nova Password</label>
              <input required type="password" placeholder="Repetir password" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:outline-none focus:border-blue-500 font-bold text-sm" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-[#0a2540] text-white font-black uppercase text-xs py-4 rounded-2xl hover:bg-black transition-all border-b-4 border-black/50">Alterar Password</button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default MerchantSettings;