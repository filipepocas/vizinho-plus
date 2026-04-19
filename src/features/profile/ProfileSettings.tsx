import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { db, auth } from '../../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { 
  ArrowLeft, User as UserIcon, Phone, MapPin, Save, 
  ShieldCheck, Trash2, AlertTriangle, RefreshCw, Mail, Bell, BellOff 
} from 'lucide-react';
import { getLocalDeviceId, removeCurrentDeviceNotification } from '../../utils/notifications';
import toast from 'react-hot-toast';

const ProfileSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, deleteUserWithHistory, locations } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rgpdDeleted, setRgpdDeleted] = useState(false);
  const [isThisDeviceLinked, setIsThisDeviceLinked] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    nif: currentUser?.nif || '',
    distrito: currentUser?.distrito || '',
    concelho: currentUser?.concelho || '',
    freguesia: currentUser?.freguesia || '',
    zipCode: currentUser?.zipCode || ''
  });

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = formData.distrito ? Object.keys(locations[formData.distrito] || {}).sort() : [];
  const freguesias = formData.distrito && formData.concelho ? (locations[formData.distrito][formData.concelho] || []).sort() : [];

  useEffect(() => {
    const checkDevice = async () => {
      if (!currentUser?.id) return;
      const deviceId = getLocalDeviceId();
      const userSnap = await getDoc(doc(db, 'users', currentUser.id));
      if (userSnap.exists()) {
        const devices = userSnap.data().devices || [];
        setIsThisDeviceLinked(devices.some((d: any) => d.deviceId === deviceId));
      }
    };
    checkDevice();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, formData);
      toast.success("PERFIL ATUALIZADO COM SUCESSO!");
    } catch (error) { toast.error("ERRO AO GUARDAR."); } finally { setLoading(false); }
  };

  const handleDisableNotifications = async () => {
    if (!currentUser?.id) return;
    if (window.confirm("ATENÇÃO: Sem as notificações não receberás confirmações de saldo.\n\nConfirmas que queres desligar os alertas NESTE equipamento?")) {
      setLoading(true);
      const success = await removeCurrentDeviceNotification(currentUser.id);
      if (success) { setIsThisDeviceLinked(false); toast.success("Alertas desativados neste aparelho."); } 
      else { toast.error("Erro ao desativar notificações."); }
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;
    if (!window.confirm("Desejas eliminar a tua conta permanentemente? Esta ação não pode ser desfeita.")) return;
    if (window.confirm("ÚLTIMO AVISO: Todos os teus dados e saldos serão apagados do servidor. Confirmas?")) {
      setIsDeleting(true);
      try {
        await deleteUserWithHistory(currentUser.id, currentUser.role as 'client'|'merchant');
        const user = auth.currentUser;
        if (user) await deleteUser(user);
        setRgpdDeleted(true);
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') alert("Por segurança, precisas de fazer login novamente antes de eliminar a conta.");
        else toast.error("Erro ao eliminar conta.");
      } finally { setIsDeleting(false); }
    }
  };

  if (rgpdDeleted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[40px] border-4 border-[#0a2540] shadow-xl max-w-sm animate-in zoom-in">
           <ShieldCheck size={60} className="text-[#00d66f] mx-auto mb-6" />
           <h2 className="text-2xl font-black uppercase text-[#0a2540] mb-4">Direito ao Esquecimento</h2>
           <p className="text-sm text-slate-500 font-bold mb-8">A tua conta e todos os teus dados foram eliminados permanentemente dos nossos servidores.</p>
           <button onClick={() => window.location.href = '/'} className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <header className="bg-[#0a2540] p-6 text-white flex items-center gap-4 border-b-8 border-[#00d66f] shadow-lg">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Configurações do Cliente</h1>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6 mt-4">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-white p-6 rounded-[30px] border-2 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3"><h3 className="font-black uppercase text-xs text-[#0a2540] flex items-center gap-2">{isThisDeviceLinked ? <Bell className="text-[#00d66f]" size={20} /> : <BellOff className="text-slate-300" size={20} />} Alertas da App</h3></div>
               {isThisDeviceLinked ? <button type="button" onClick={handleDisableNotifications} className="text-[10px] font-black text-red-500 uppercase hover:underline transition-all">Desativar</button> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inativo</span>}
            </div>
            <p className="text-[10px] text-slate-500 font-bold leading-tight">{isThisDeviceLinked ? "Este telemóvel está configurado para receber notificações em tempo real." : "As notificações estão desligadas neste aparelho."}</p>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border-4 border-[#0a2540]">
            <div className="flex items-center gap-3 mb-6"><UserIcon className="text-[#0a2540]" size={24} /><h3 className="font-black text-[#0a2540] uppercase text-lg italic tracking-tighter">Os Meus Dados</h3></div>
            <div className="space-y-4">
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nome Completo" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" required />
              <input type="text" maxLength={9} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} placeholder="NIF (Para faturas)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Telemóvel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" />
              
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 space-y-3">
                 <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2"><MapPin size={14}/> Morada (Zonas)</p>
                 <select required value={formData.distrito} onChange={e=>setFormData({...formData, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-[#00d66f]">
                    <option value="">Distrito</option>
                    {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                 </select>
                 <select required disabled={!formData.distrito} value={formData.concelho} onChange={e=>setFormData({...formData, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                    <option value="">Concelho</option>
                    {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <select required disabled={!formData.concelho} value={formData.freguesia} onChange={e=>setFormData({...formData, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-[#00d66f] disabled:opacity-50">
                    <option value="">Freguesia</option>
                    {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                 </select>
                 <input type="text" maxLength={8} value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} placeholder="Cód Postal (0000-000)" className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-xs focus:border-[#00d66f] outline-none" />
              </div>

              <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl opacity-60 cursor-not-allowed">
                <Mail size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-500 truncate">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-black hover:text-[#00d66f] hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-black/40">
            {loading ? <RefreshCw className="animate-spin" /> : <><Save size={20} /> Guardar Alterações</>}
          </button>

          <div className="pt-10">
            <div className="bg-red-50 p-6 rounded-[30px] border-2 border-red-100">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <AlertTriangle size={20} />
                <h4 className="text-xs font-black uppercase tracking-widest">Zona de Perigo</h4>
              </div>
              <button type="button" onClick={handleDeleteAccount} disabled={isDeleting} className="w-full py-4 bg-white border-2 border-red-200 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm">
                {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />} Eliminar Conta Permanentemente
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ProfileSettings;