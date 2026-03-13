// src/features/profile/ProfileSettings.tsx
import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { db, auth } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Tag, 
  Save, 
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const ProfileSettings: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { currentUser, deleteUserWithHistory, logout } = useStore();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
    category: currentUser?.category || '',
    zipCode: currentUser?.zipCode || '',
    freguesia: currentUser?.freguesia || ''
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
      "Tens a certeza que queres eliminar a tua conta?\n\n" +
      "Esta ação irá apagar permanentemente o teu perfil e todo o teu histórico de cashback. Não poderás recuperar estes dados."
    );

    if (confirmFirst) {
      const confirmSecond = window.confirm(
        "ÚLTIMO AVISO: Todos os teus dados serão destruídos agora. Confirmas?"
      );

      if (confirmSecond) {
        setIsDeleting(true);
        try {
          // CORREÇÃO DE TIPO: Mapear o role para garantir compatibilidade com a função deleteUserWithHistory
          const roleToDelete: 'merchant' | 'client' = currentUser.role === 'merchant' ? 'merchant' : 'client';
          
          // 1. Eliminar dados e histórico na Firestore
          await deleteUserWithHistory(currentUser.id, roleToDelete);
          
          // 2. Logout e limpeza do estado
          await logout();
          
          alert("Conta eliminada com sucesso. Até breve!");
        } catch (error) {
          console.error("Erro ao eliminar conta:", error);
          alert("Ocorreu um erro ao eliminar a conta. Por favor, contacta o suporte.");
        } finally {
          setIsDeleting(false);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      {/* HEADER BRUTALISTA */}
      <header className="bg-[#0f172a] px-6 py-10 text-white rounded-b-[40px] shadow-2xl mb-12 border-b-8 border-[#00d66f] relative overflow-hidden">
        <div className="max-w-5xl mx-auto flex items-center gap-6 relative z-10">
          <button 
            onClick={onBack} 
            className="bg-[#00d66f] text-[#0f172a] p-3 rounded-2xl shadow-[4px_4px_0px_#ffffff] active:scale-95 transition-all"
          >
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
          
          {/* SECÇÃO: DADOS BÁSICOS */}
          <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-[#0f172a]">
            <div className="flex items-center gap-3 mb-8">
              <User className="text-[#00d66f]" size={20} strokeWidth={3} />
              <h3 className="font-black text-[#0f172a] uppercase text-xs tracking-widest">Dados Pessoais</h3>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Completo</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Telemóvel</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black outline-none focus:border-[#00d66f] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECÇÃO EXTRA: APENAS PARA LOJISTAS */}
          {currentUser?.role === 'merchant' && (
            <div className="bg-white p-8 rounded-[40px] shadow-xl border-4 border-[#0f172a]">
              <div className="flex items-center gap-3 mb-8">
                <MapPin className="text-[#00d66f]" size={20} strokeWidth={3} />
                <h3 className="font-black text-[#0f172a] uppercase text-xs tracking-widest">Dados da Loja</h3>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria / Ramo</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="text"
                      placeholder="Ex: Restauração, Oficina..."
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Morada</label>
                  <input 
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código Postal</label>
                    <input 
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                      className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-[#00d66f] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Freguesia</label>
                    <input 
                      type="text"
                      value={formData.freguesia}
                      onChange={(e) => setFormData({...formData, freguesia: e.target.value})}
                      className="w-full bg-slate-50 border-4 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-[#00d66f] transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INFO DE CONTA (NÃO EDITÁVEL) */}
          <div className="bg-slate-100/50 p-6 rounded-[30px] border-2 border-dashed border-slate-200">
            <div className="flex items-center gap-3 opacity-50">
              <ShieldCheck size={16} />
              <p className="text-[10px] font-black uppercase tracking-widest">NIF: {currentUser?.nif}</p>
            </div>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 ml-7">O NIF não pode ser alterado manualmente por motivos de segurança.</p>
          </div>

          {/* ÁREA DE PERIGO: ELIMINAÇÃO */}
          <div className="pt-8 mt-8 border-t-2 border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-red-500">
              <AlertTriangle size={16} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Zona de Perigo</h4>
            </div>
            <button 
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="w-full py-4 rounded-2xl bg-white border-2 border-red-100 text-red-400 font-black uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all flex items-center justify-center gap-3"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> A eliminar conta...
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Eliminar Minha Conta
                </>
              )}
            </button>
          </div>

          {/* BOTÃO GUARDAR */}
          <button 
            type="submit"
            disabled={loading || isDeleting}
            className={`w-full py-6 rounded-[30px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${
              saved 
                ? 'bg-[#00d66f] text-[#0f172a]' 
                : 'bg-[#0f172a] text-white hover:bg-black active:scale-95'
            }`}
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle2 size={20} /> Alterações Guardadas!
              </>
            ) : (
              <>
                <Save size={20} /> Guardar Perfil
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
};

export default ProfileSettings;