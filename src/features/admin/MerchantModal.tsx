// src/features/admin/MerchantModal.tsx

import React, { useState } from 'react';
import { X, Store, Mail, Hash, Percent, MapPin, Loader2, Locate, Tag, User, Phone, Lock, AlertCircle } from 'lucide-react';
import { provisionAuth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface MerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MERCH_CATEGORIES = [
  "Restauração & Bebidas", "Mercearias & Supermercados", "Talhos & Peixarias",
  "Padarias & Pastelarias", "Moda & Acessórios", "Saúde & Farmácias",
  "Beleza & Cabeleireiros", "Oficinas & Automóveis", "Construção & Bricolage",
  "Artigos para Casa & Decoração", "Papelarias & Livrarias", "Floristas & Jardinagem",
  "Petshops & Veterinários", "Tecnologia & Informática", "Desporto & Lazer",
  "Ópticas", "Ourivesarias & Relojoarias", "Lavandarias & Engomadoria",
  "Sapateiros & Reparações", "Educação & Centros de Explicações", "Outros"
];

const MerchantModal: React.FC<MerchantModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '', responsibleName: '', phone: '', email: '', password: '', 
    nif: '', cashbackPercent: '5', category: '', freguesia: '', zipCode: ''
  });

  if (!isOpen) return null;

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4) + '-' + value.substring(4, 7);
    setFormData({ ...formData, zipCode: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      setError('POR FAVOR, SELECIONE UM SETOR DE ATIVIDADE.');
      return;
    }
    const zipCodeRegex = /^\d{4}-\d{3}$/;
    if (!zipCodeRegex.test(formData.zipCode)) {
      setError('CÓDIGO POSTAL INVÁLIDO. USE O FORMATO 0000-000');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Criar no Auth usando a ligação de provisão para não deslogar o admin
      const userCredential = await createUserWithEmailAndPassword(provisionAuth, formData.email.trim(), formData.password);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: formData.name.trim(),
        shopName: formData.name.trim(),
        responsibleName: formData.responsibleName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.toLowerCase().trim(),
        nif: formData.nif.trim(),
        role: 'merchant',
        status: 'active',
        category: formData.category,
        cashbackPercent: Number(formData.cashbackPercent),
        freguesia: formData.freguesia.trim(),
        zipCode: formData.zipCode.trim(),
        wallet: { available: 0, pending: 0 },
        createdAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
            setError('ESTE EMAIL JÁ ESTÁ SENDO UTILIZADO POR OUTRO UTILIZADOR.');
        } else {
            setError(err.message || 'Erro ao criar parceiro.');
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
      {/* Container do Modal com Scroll Interno */}
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in duration-300 my-auto relative flex flex-col">
        
        {/* Header Fixo no Topo do Modal */}
        <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-20 border-b-2 border-white/10">
          <div className="flex items-center gap-3">
            <Store className="text-[#00d66f]" size={24} />
            <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none">Novo Parceiro</h2>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-red-500 hover:rotate-90 p-2 rounded-xl transition-all duration-300"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Formulário com Scroll Próprio */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Nome da Loja</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Nome do Responsável</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.responsibleName} onChange={e => setFormData({...formData, responsibleName: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Telefone / Tlm</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="tel" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">NIF</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required maxLength={9} className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Setor de Atividade</label>
              <div className="relative">
                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="">SELECIONE O SETOR...</option>
                  {MERCH_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required type="email" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="password" placeholder="••••••••" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">% Cashback</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="number" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.cashbackPercent} onChange={e => setFormData({...formData, cashbackPercent: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Freguesia</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.freguesia} onChange={e => setFormData({...formData, freguesia: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Código Postal</label>
                <div className="relative">
                  <Locate className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required maxLength={8} placeholder="0000-000" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.zipCode} onChange={handleZipCodeChange} />
                </div>
              </div>
            </div>

            <div className="pt-4 sticky bottom-0 bg-white pb-2">
                <button 
                    disabled={loading} 
                    type="submit" 
                    className="w-full bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-8 border-black/10 shadow-xl"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Registo Master'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MerchantModal;