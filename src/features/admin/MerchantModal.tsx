// src/features/admin/MerchantModal.tsx

import React, { useState, useEffect } from 'react';
import { 
  X, Store, Mail, Hash, Percent, MapPin, Loader2, Locate, 
  Tag, User, Phone, Lock, AlertCircle, Pencil, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { provisionAuth, db } from '../../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { useStore } from '../../store/useStore';
import { User as UserProfile } from '../../types';
import toast from 'react-hot-toast';

interface MerchantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantToEdit?: UserProfile | null;
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

const INITIAL_FORM = {
  name: '',
  responsibleName: '',
  phone: '',
  email: '',
  password: '',
  nif: '',
  cashbackPercent: '5',
  category: '',
  distrito: '',
  concelho: '',
  freguesia: '',
  zipCode: '',
  address: '',
  latitude: '',
  longitude: '',
  status: 'active' as 'active' | 'disabled' | 'pending'
};

const MerchantModal: React.FC<MerchantModalProps> = ({ isOpen, onClose, onSuccess, merchantToEdit }) => {
  const { locations } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);

  const isEditing = Boolean(merchantToEdit);

  useEffect(() => {
    if (!isOpen) return;

    if (merchantToEdit) {
      setFormData({
        name: merchantToEdit.shopName || merchantToEdit.name || '',
        responsibleName: merchantToEdit.responsibleName || '',
        phone: merchantToEdit.phone || '',
        email: merchantToEdit.email || '',
        password: '', // Não obrigatória na edição
        nif: merchantToEdit.nif || '',
        cashbackPercent: (merchantToEdit.cashbackPercent ?? 5).toString(),
        category: merchantToEdit.category || '',
        distrito: merchantToEdit.distrito || '',
        concelho: merchantToEdit.concelho || '',
        freguesia: merchantToEdit.freguesia || '',
        zipCode: merchantToEdit.zipCode || '',
        address: merchantToEdit.address || '',
        latitude: merchantToEdit.latitude !== undefined && merchantToEdit.latitude !== null ? merchantToEdit.latitude.toString() : '',
        longitude: merchantToEdit.longitude !== undefined && merchantToEdit.longitude !== null ? merchantToEdit.longitude.toString() : '',
        status: (merchantToEdit.status as 'active' | 'disabled' | 'pending') || 'active'
      });
      setError('');
    } else {
      setFormData(INITIAL_FORM);
      setError('');
    }
  }, [isOpen, merchantToEdit]);

  if (!isOpen) return null;

  const distritos = Object.keys(locations || {}).sort();
  const merchantConcelhos = formData.distrito ? Object.keys(locations[formData.distrito] || {}).sort() : [];
  const merchantFreguesias = formData.distrito && formData.concelho ? (locations[formData.distrito][formData.concelho] || []).sort() : [];

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4) + '-' + value.substring(4, 7);
    setFormData({ ...formData, zipCode: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('POR FAVOR, INDIQUE O NOME DA LOJA.');
      return;
    }
    if (!formData.category) {
      setError('POR FAVOR, SELECIONE UM SETOR DE ATIVIDADE.');
      return;
    }
    if (!formData.distrito || !formData.concelho || !formData.freguesia) {
      setError('POR FAVOR, SELECIONE A LOCALIZAÇÃO COMPLETA (DISTRITO, CONCELHO E FREGUESIA).');
      return;
    }
    const zipCodeRegex = /^\d{4}-\d{3}$/;
    if (formData.zipCode && !zipCodeRegex.test(formData.zipCode)) {
      setError('CÓDIGO POSTAL INVÁLIDO. USE O FORMATO 0000-000');
      return;
    }

    const hasLat = formData.latitude.trim() !== '';
    const hasLng = formData.longitude.trim() !== '';
    const parsedLat = hasLat ? Number(formData.latitude.replace(',', '.')) : undefined;
    const parsedLng = hasLng ? Number(formData.longitude.replace(',', '.')) : undefined;

    if (hasLat !== hasLng) {
      setError('PREENCHA LATITUDE E LONGITUDE OU DEIXE AMBAS EM BRANCO.');
      return;
    }
    if (hasLat && (!Number.isFinite(parsedLat) || parsedLat! < -90 || parsedLat! > 90 || !Number.isFinite(parsedLng) || parsedLng! < -180 || parsedLng! > 180)) {
      setError('COORDENADAS INVÁLIDAS (-90 A 90 PARA LATITUDE, -180 A 180 PARA LONGITUDE).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditing && merchantToEdit) {
        // MODO EDIÇÃO
        const merchantRef = doc(db, 'users', merchantToEdit.id);
        await updateDoc(merchantRef, {
          name: formData.name.trim(),
          shopName: formData.name.trim(),
          responsibleName: formData.responsibleName.trim(),
          phone: formData.phone.trim(),
          nif: formData.nif.trim(),
          category: formData.category,
          cashbackPercent: Number(formData.cashbackPercent),
          status: formData.status, // Garante que o estado é explicitamente atualizado
          distrito: formData.distrito,
          concelho: formData.concelho,
          freguesia: formData.freguesia.trim(),
          zipCode: formData.zipCode.trim(),
          address: formData.address.trim(),
          latitude: parsedLat !== undefined ? parsedLat : deleteField(),
          longitude: parsedLng !== undefined ? parsedLng : deleteField(),
          updatedAt: serverTimestamp()
        });

        toast.success(`Loja "${formData.name.trim()}" atualizada com sucesso!`);
        onSuccess();
        onClose();
      } else {
        // MODO CRIAÇÃO
        if (!formData.password || formData.password.length < 6) {
          setError('A PALAVRA-PASSE DEVE TER NO MÍNIMO 6 CARACTERES.');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(
          provisionAuth, 
          formData.email.trim(), 
          formData.password
        );
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: formData.name.trim(),
          shopName: formData.name.trim(),
          responsibleName: formData.responsibleName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.toLowerCase().trim(),
          nif: formData.nif.trim(),
          role: 'merchant',
          status: 'active', // Sempre ativa por padrão na criação master
          category: formData.category,
          cashbackPercent: Number(formData.cashbackPercent),
          distrito: formData.distrito,
          concelho: formData.concelho,
          freguesia: formData.freguesia.trim(),
          zipCode: formData.zipCode.trim(),
          address: formData.address.trim(),
          latitude: parsedLat !== undefined ? parsedLat : null,
          longitude: parsedLng !== undefined ? parsedLng : null,
          wallet: { available: 0, pending: 0 },
          createdAt: serverTimestamp()
        });

        toast.success(`Nova loja parceira "${formData.name.trim()}" criada e ativa!`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('ESTE EMAIL JÁ ESTÁ SENDO UTILIZADO POR OUTRO UTILIZADOR.');
      } else {
        setError(err.message || 'Erro ao processar loja parceira.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[40px] border-4 border-[#0a2540] shadow-[16px_16px_0px_0px_#00d66f] overflow-hidden animate-in zoom-in duration-300 my-auto relative flex flex-col">
        
        <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center shrink-0 sticky top-0 z-20 border-b-2 border-white/10">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <div className="bg-[#00d66f] p-2.5 rounded-xl text-[#0a2540]">
                <Pencil size={20} />
              </div>
            ) : (
              <div className="bg-[#00d66f] p-2.5 rounded-xl text-[#0a2540]">
                <Store size={20} />
              </div>
            )}
            <div>
              <h2 className="font-black uppercase italic tracking-tighter text-xl leading-none text-[#00d66f]">
                {isEditing ? 'Editar Loja Parceira' : 'Novo Parceiro Comercial'}
              </h2>
              {isEditing && (
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1 truncate max-w-xs">
                  {merchantToEdit?.shopName || merchantToEdit?.name}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="bg-white/10 hover:bg-red-500 hover:rotate-90 p-2 rounded-xl transition-all duration-300"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase border-2 border-red-100 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* SELETOR DE ESTADO (Ativo / Suspenso) NA EDIÇÃO */}
            {isEditing && (
              <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-200">
                <label className="block text-[10px] font-black uppercase text-[#0a2540] mb-2 tracking-wider">
                  Estado da Loja no Sistema
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                    className={`py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all border-2 ${
                      formData.status === 'active' 
                        ? 'bg-green-500 text-white border-green-600 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 size={16} /> Ativo
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'disabled' })}
                    className={`py-3 px-4 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all border-2 ${
                      formData.status === 'disabled' 
                        ? 'bg-red-500 text-white border-red-600 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldAlert size={16} /> Suspenso
                  </button>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">
                  {formData.status === 'active' 
                    ? '✓ A loja pode emitir e resgatar cashback e aparece na listagem dos utilizadores.' 
                    : '⚠ Loja bloqueada de transações no terminal e oculta na app.'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Nome Comercial da Loja</label>
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
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Telefone / Telemóvel</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">% Cashback Praticado</label>
                <div className="relative">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="number" min="0" max="100" step="0.5" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.cashbackPercent} onChange={e => setFormData({...formData, cashbackPercent: e.target.value})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">
                {isEditing ? 'E-mail de Registo (Identificador)' : 'E-mail de Acesso e Login'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  required 
                  type="email" 
                  disabled={isEditing}
                  className={`w-full pl-12 p-4 border-2 rounded-2xl outline-none font-bold text-sm ${isEditing ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-100 focus:border-[#00d66f]'}`} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            {!isEditing && (
              <div>
                <label className="block text-[10px] font-black uppercase mb-2 text-slate-400 ml-2">Palavra-passe Inicial</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input required type="password" placeholder="Mínimo 6 caracteres" className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#00d66f] outline-none font-bold text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
               <p className="text-[10px] font-black uppercase text-slate-400">Localização Comercial e Morada</p>
               <select required value={formData.distrito} onChange={e=>setFormData({...formData, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200 bg-white">
                  <option value="">Distrito</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
               <select required disabled={!formData.distrito} value={formData.concelho} onChange={e=>setFormData({...formData, concelho: e.target.value, freguesia: ''})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200 bg-white disabled:opacity-50">
                  <option value="">Concelho</option>
                  {merchantConcelhos.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
               <select required disabled={!formData.concelho} value={formData.freguesia} onChange={e=>setFormData({...formData, freguesia: e.target.value})} className="w-full p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200 bg-white disabled:opacity-50">
                  <option value="">Freguesia</option>
                  {merchantFreguesias.map(f => <option key={f} value={f}>{f}</option>)}
               </select>
               
               <div className="relative">
                 <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                 <input required placeholder="Morada Exata (Rua e Número)" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-12 p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200 bg-white" />
               </div>

               <div className="relative">
                 <Locate className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                 <input required placeholder="Cód. Postal (0000-000)" value={formData.zipCode} onChange={handleZipCodeChange} className="w-full pl-12 p-3 rounded-xl font-bold text-xs outline-none focus:border-[#00d66f] border border-slate-200 bg-white" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                 <div>
                   <label className="mb-1 block text-[9px] font-black uppercase text-slate-400">Latitude (Opcional - GPS)</label>
                   <input type="number" step="any" inputMode="decimal" placeholder="Ex: 38.7223" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold outline-none focus:border-[#00d66f]" />
                 </div>
                 <div>
                   <label className="mb-1 block text-[9px] font-black uppercase text-slate-400">Longitude (Opcional - GPS)</label>
                   <input type="number" step="any" inputMode="decimal" placeholder="Ex: -9.1393" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold outline-none focus:border-[#00d66f]" />
                 </div>
               </div>
            </div>

            <div className="pt-4 sticky bottom-0 bg-white pb-2 flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 bg-slate-100 text-slate-500 p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={loading} 
                type="submit" 
                className="flex-[2] bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-6 border-black/10 shadow-xl disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : isEditing ? 'Guardar Alterações' : 'Confirmar Registo Master'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MerchantModal;