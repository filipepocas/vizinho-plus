import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { db, auth } from '../../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { 
  ArrowLeft, User as UserIcon, Phone, MapPin, Tag, Save, 
  ShieldCheck, Trash2, AlertTriangle, RefreshCw, Mail, IdCard, Bell, BellOff 
} from 'lucide-react';
import { getLocalDeviceId, removeCurrentDeviceNotification } from '../../utils/notifications';
import toast from 'react-hot-toast';

const ProfileSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, deleteUserWithHistory, logout } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rgpdDeleted, setRgpdDeleted] = useState(false);

  const [isThisDeviceLinked, setIsThisDeviceLinked] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    category: currentUser?.category || '',
    zipCode: currentUser?.zipCode || '',
    freguesia: currentUser?.freguesia || '',
    nif: currentUser?.nif || '' 
  });

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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("PERFIL ATUALIZADO!");
    } catch (error) {
      toast.error("ERRO AO GUARDAR.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!currentUser?.id) return;

    const confirm1 = window.confirm(
      "ATENÇÃO: Não é recomendável desativar as notificações. \n\nSem elas, não receberás confirmações de cashback em tempo real nem ofertas exclusivas. Desejas continuar?"
    );

    if (confirm1) {
      const confirm2 = window.confirm(
        "CONFIRMAÇÃO FINAL: Tens a certeza que queres desligar os alertas NESTE equipamento?"
      );

      if (confirm2) {
        setLoading(true);
        const success = await removeCurrentDeviceNotification(currentUser.id);
        if (success) {
          setIsThisDeviceLinked(false);
          toast.success("Alertas desativados neste aparelho.");
        } else {
          toast.error("Erro ao desativar notificações.");
        }
        setLoading(false);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;

    const confirm1 = window.confirm("Desejas eliminar a tua conta permanentemente? Esta ação não pode ser desfeita.");
    if (!confirm1) return;

    const confirm2 = window.confirm("ÚLTIMO AVISO: Todos os teus dados, saldos e histórico serão apagados do servidor agora. Confirmas?");
    if (confirm2) {
      setIsDeleting(true);
      try {
        const userId = currentUser.id;
        const role = currentUser.role as 'client' | 'merchant';
        
        await deleteUserWithHistory(userId, role);
        
        const user = auth.currentUser;
        if (user) {
          await deleteUser(user);
        }
        
        setRgpdDeleted(true);
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          alert("Por segurança, precisas de fazer login novamente antes de eliminar a conta.");
        } else {
          toast.error("Erro ao eliminar conta.");
        }
        console.error(error);
      } finally {
        setIsDeleting(false);
      }
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
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Configurações</h1>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-6 mt-4">
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-white p-6 rounded-[30px] border-2 border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  {isThisDeviceLinked ? <Bell className="text-[#00d66f]" size={20} /> : <BellOff className="text-slate-300" size={20} />}
                  <h3 className="font-black uppercase text-xs text-[#0a2540]">Alertas neste aparelho</h3>
               </div>
               {isThisDeviceLinked ? (
                 <button type="button" onClick={handleDisableNotifications} className="text-[10px] font-black text-red-500 uppercase hover:underline transition-all">Desativar</button>
               ) : (
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inativo</span>
               )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold leading-tight">
               {isThisDeviceLinked 
                 ? "Este telemóvel está configurado para receber notificações Cloud Messaging." 
                 : "As notificações estão desligadas. Faz login novamente ou ative no painel principal para ligar."}
            </p>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="text-[#0a2540]" size={20} />
              <h3 className="font-black text-[#0a2540] uppercase text-xs">Dados de Perfil</h3>
            </div>
            <div className="space-y-4">
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nome Completo" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" required />
              <input type="text" maxLength={9} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} placeholder="NIF (Para faturas)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" />
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="Telemóvel" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-sm focus:border-[#00d66f] outline-none transition-colors" />
              <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl opacity-60 cursor-not-allowed">
                <Mail size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-500 truncate">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-black/40">
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