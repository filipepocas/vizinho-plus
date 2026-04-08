import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { db, auth } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { 
  ArrowLeft, User as UserIcon, Phone, MapPin, Tag, Save, 
  ShieldCheck, CheckCircle2, Trash2, AlertTriangle, RefreshCw, Mail, IdCard 
} from 'lucide-react';

const ProfileSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, deleteUserWithHistory, logout } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rgpdDeleted, setRgpdDeleted] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    category: currentUser?.category || '',
    zipCode: currentUser?.zipCode || '',
    freguesia: currentUser?.freguesia || '',
    nif: currentUser?.nif || '' 
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Erro ao guardar alterações.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.id) return;

    const confirmFirst = window.confirm(
      "Tens a certeza que queres eliminar a tua conta?\n\nEsta ação irá apagar permanentemente o teu perfil e todo o teu histórico de saldos. Não poderás recuperar estes dados."
    );

    if (confirmFirst) {
      const confirmSecond = window.confirm("ÚLTIMO AVISO: Todos os teus dados serão destruídos agora sem possibilidade de recuperação. Confirmas?");
      if (confirmSecond) {
        setIsDeleting(true);
        try {
          const userId = currentUser.id;
          const roleToDelete = currentUser.role === 'merchant' ? 'merchant' : 'client';
          
          // 1. Apaga primeiro todos os dados na Base de Dados (Transações, Saldo, Perfil)
          await deleteUserWithHistory(userId, roleToDelete);
          
          // 2. Apaga a conta central de Autenticação do Firebase
          if (auth.currentUser) {
            await deleteUser(auth.currentUser);
          }
          
          // 3. Mostra Ecrã RGPD de Confirmação
          setRgpdDeleted(true);

        } catch (error: any) {
          console.error("Erro ao eliminar conta:", error);
          if (error.code === 'auth/requires-recent-login') {
             alert("Por motivos de segurança exigidos pelo sistema, precisas de ter feito login recentemente para destruir a conta. Por favor, sai da aplicação, entra novamente com a tua password e repete o processo.");
          } else {
             alert("Ocorreu um erro no servidor. A sessão será encerrada.");
          }
          await logout();
        } finally {
          setIsDeleting(false);
        }
      }
    }
  };

  // ECRÃ DE CONFIRMAÇÃO DE DIREITO AO ESQUECIMENTO (RGPD)
  if (rgpdDeleted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-white p-10 md:p-14 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f] max-w-lg text-center animate-in zoom-in duration-500">
           <div className="bg-[#00d66f] w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border-4 border-[#0a2540] rotate-3">
              <ShieldCheck size={48} className="text-[#0a2540]" />
           </div>
           <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-4">Direito ao Esquecimento</h2>
           
           <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl mb-8">
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                A sua conta foi <strong>eliminada com sucesso</strong>. Ao abrigo do Regulamento Geral de Proteção de Dados (RGPD), confirmamos que todos os seus dados pessoais, informações de contacto, saldos acumulados e histórico de movimentos foram apagados permanentemente e esquecidos pelos nossos servidores.
              </p>
           </div>
           
           <button 
             onClick={async () => { await logout(); onBack(); }}
             className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase tracking-widest hover:bg-black transition-all border-b-8 border-black/20"
           >
             Sair em Segurança
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20 text-[#0f172a]">
      <header className="bg-[#0f172a] px-6 py-10 text-white rounded-b-[40px] shadow-2xl mb-12 border-b-8 border-[#00d66f]">
        <div className="max-w-5xl mx-auto flex items-center gap-6">
          <button onClick={onBack} className="bg-[#00d66f] text-[#0f172a] p-3 rounded-2xl shadow-[4px_4px_0px_#ffffff] active:scale-95 transition-all">
            <ArrowLeft size={24} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Configurações</h1>
            <p className="text-[#00d66f] text-[9px] font-black uppercase tracking-[0.2em] mt-1">Gere a tua identidade na rede</p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6">
        <form onSubmit={handleSave} className="space-y-6">
          
          {currentUser?.role === 'client' && (
            <div className="bg-[#00d66f] p-6 rounded-[30px] border-4 border-[#0a2540] shadow-[6px_6px_0px_#0a2540] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-[#0a2540] opacity-80 tracking-widest mb-1">O Teu Cartão Digital Vizinho+</p>
                <p className="text-2xl font-mono font-black text-[#0a2540] tracking-[0.2em]">
                  {currentUser.customerNumber?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3') || 'Sem Cartão'}
                </p>
              </div>
              <div className="bg-[#0a2540] p-3 rounded-2xl text-[#00d66f]">
                <IdCard size={24} />
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-[#0f172a]">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-slate-100 p-2 rounded-xl"><UserIcon className="text-[#0f172a]" size={20} strokeWidth={3} /></div>
              <h3 className="font-black text-[#0f172a] uppercase text-xs tracking-widest">Dados Pessoais</h3>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] focus:bg-white" required />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">NIF <span className="text-[8px]">(Opcional)</span></label>
                <input type="text" maxLength={9} value={formData.nif} onChange={(e) => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} placeholder="Ainda não inseriu o NIF" className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-[#00d66f] focus:bg-white" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telemóvel</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black outline-none focus:border-[#00d66f] focus:bg-white" />
                </div>
              </div>
              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Email (Apenas Leitura)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="email" value={currentUser?.email || ''} disabled className="w-full bg-slate-100 border-4 border-slate-200 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold cursor-not-allowed" />
                </div>
              </div>
            </div>
          </div>

          {currentUser?.role === 'merchant' && (
            <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-[#0f172a]">
              <div className="flex items-center gap-3 mb-8">
                <div className="bg-slate-100 p-2 rounded-xl"><MapPin className="text-[#0f172a]" size={20} strokeWidth={3} /></div>
                <h3 className="font-black text-[#0f172a] uppercase text-xs tracking-widest">Dados da Loja</h3>
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria / Ramo</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Morada Comercial</label>
                  <input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cód. Postal</label>
                    <input type="text" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-[#00d66f]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Freguesia</label>
                    <input type="text" value={formData.freguesia} onChange={(e) => setFormData({...formData, freguesia: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f]" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || isDeleting} className={`w-full py-6 rounded-[30px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${saved ? 'bg-[#00d66f] text-[#0f172a]' : 'bg-[#0f172a] text-white hover:bg-black'}`}>
            {loading ? <RefreshCw size={24} className="animate-spin text-[#00d66f]" /> : saved ? <><CheckCircle2 size={24} strokeWidth={3} /> Sucesso!</> : <><Save size={24} strokeWidth={3} /> Guardar Alterações</>}
          </button>

          <div className="pt-12 mt-8 border-t-4 border-slate-100">
            <div className="bg-red-50 p-6 rounded-[35px] border-2 border-red-100">
              <div className="flex items-center gap-2 mb-4 text-red-600">
                <AlertTriangle size={18} strokeWidth={3} />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Zona Crítica</h4>
              </div>
              <p className="text-[9px] text-red-400 font-bold uppercase mb-6 leading-relaxed">Ao eliminar a conta, perderás permanentemente o acesso ao teu saldo e histórico.</p>
              <button type="button" onClick={handleDeleteAccount} disabled={isDeleting} className="w-full py-4 rounded-2xl bg-white border-2 border-red-200 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white flex items-center justify-center gap-3">
                {isDeleting ? <><RefreshCw size={14} className="animate-spin" /> Destruindo dados...</> : <><Trash2 size={14} /> Eliminar Conta Permanentemente</>}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default ProfileSettings;