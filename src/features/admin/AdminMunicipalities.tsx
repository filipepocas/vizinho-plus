// src/features/admin/AdminMunicipalities.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { Building2, Plus, Trash2, Edit3, Loader2, Search, MapPin, Link2, Phone, UserPlus, ShieldOff, ShieldCheck, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { MunicipalityFAQ, User as UserProfile } from '../../types';
import { useStore } from '../../store/useStore';
import MunicipalityUserModal from './MunicipalityUserModal';
import { getAuth, updatePassword } from 'firebase/auth';

const AdminMunicipalities: React.FC = () => {
  const { locations } = useStore();
  const [faqs, setFaqs] = useState<MunicipalityFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [municipalityUsers, setMunicipalityUsers] = useState<UserProfile[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [changingPassId, setChangingPassId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');

  const [formData, setFormData] = useState<MunicipalityFAQ>({
    distrito: '', concelho: '', freguesia: '', type: 'camara',
    question: '', answer: '', contacts: '', links: '', createdAt: null
  });

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = formData.distrito ? Object.keys(locations[formData.distrito] || {}).sort() : [];
  const freguesias = formData.distrito && formData.concelho ? (locations[formData.distrito][formData.concelho] || []).sort() : [];

  useEffect(() => {
    const q = query(collection(db, 'municipalities_faqs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap: any) => {
      setFaqs(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MunicipalityFAQ)));
      setLoading(false);
    }, (error: any) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'municipality'));
    const unsubscribe = onSnapshot(q, (snap: any) => {
      setMunicipalityUsers(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.distrito || !formData.concelho) return toast.error("Distrito e Concelho são obrigatórios.");
    if (!formData.question || !formData.answer) return toast.error("Pergunta e Resposta são obrigatórias.");

    setSaving(true);
    try {
      const dataToSave = {
        distrito: formData.distrito,
        concelho: formData.concelho,
        freguesia: formData.freguesia || '', 
        type: formData.type,
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        contacts: formData.contacts?.trim() || '',
        links: formData.links?.trim() || '',
      };

      if (editingId) {
        await updateDoc(doc(db, 'municipalities_faqs', editingId), { ...dataToSave, updatedAt: serverTimestamp() });
        toast.success("Informação atualizada!");
      } else {
        await addDoc(collection(db, 'municipalities_faqs'), { ...dataToSave, createdAt: serverTimestamp() });
        toast.success("Informação adicionada!");
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      toast.error("Erro ao guardar dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar esta informação permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'municipalities_faqs', id));
      toast.success("Informação removida.");
    } catch (err) {
      toast.error("Erro ao eliminar.");
    }
  };

  const startEdit = (faq: MunicipalityFAQ) => {
    setFormData({
      distrito: faq.distrito,
      concelho: faq.concelho,
      freguesia: faq.freguesia || '',
      type: faq.type,
      question: faq.question,
      answer: faq.answer,
      contacts: faq.contacts || '',
      links: faq.links || '',
      createdAt: faq.createdAt
    });
    setEditingId(faq.id!);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ distrito: '', concelho: '', freguesia: '', type: 'camara', question: '', answer: '', contacts: '', links: '', createdAt: null });
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    await updateDoc(doc(db, 'users', userId), { status: newStatus });
    toast.success(`Utilizador ${newStatus === 'active' ? 'ativado' : 'suspenso'}.`);
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPass || newPass.length < 6) return toast.error('Mínimo 6 caracteres.');
    try {
      const provisionAuthInstance = getAuth();
      const user = provisionAuthInstance.currentUser;
      if (!user) return toast.error('Sem sessão ativa.');
      await updatePassword(user, newPass);
      toast.success('Password alterada no Auth.');
      setChangingPassId(null);
      setNewPass('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar password.');
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#00d66f]" size={40} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-2xl border-4 border-blue-200 text-blue-600">
              <Building2 size={28} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Apoio ao Munícipe</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gestão de Informações, Juntas e Câmaras</p>
            </div>
          </div>
          <button 
            onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }} 
            className="bg-[#0a2540] text-blue-400 px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-2 border-b-4 border-black/40"
          >
            {showForm ? 'Cancelar Edição' : <><Plus size={18} /> Adicionar Informação</>}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="bg-slate-50 p-8 rounded-[30px] border-2 border-slate-200 mb-10 space-y-6 animate-in slide-in-from-top-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">1. Localização e Tipo</h4>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <select required value={formData.distrito} onChange={e=>setFormData({...formData, distrito: e.target.value, concelho: '', freguesia: ''})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm">
                         <option value="">Distrito</option>
                         {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <select required disabled={!formData.distrito} value={formData.concelho} onChange={e=>setFormData({...formData, concelho: e.target.value, freguesia: ''})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm disabled:opacity-50">
                         <option value="">Concelho</option>
                         {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <select disabled={!formData.concelho} value={formData.freguesia} onChange={e=>setFormData({...formData, freguesia: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm disabled:opacity-50">
                         <option value="">Todas as Freguesias (Geral)</option>
                         {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select required value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as 'camara'|'junta'})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm uppercase">
                         <option value="camara">Câmara Municipal</option>
                         <option value="junta">Junta de Freguesia</option>
                      </select>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">2. Informação Útil</h4>
                   <input required type="text" placeholder="Título / Tópico (Ex: Horário de Atendimento)" value={formData.question} onChange={e=>setFormData({...formData, question: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                   <textarea required rows={4} placeholder="Conteúdo / Resposta..." value={formData.answer} onChange={e=>setFormData({...formData, answer: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm resize-none" />
                </div>

                <div className="space-y-4 md:col-span-2">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">3. Contactos e Anexos (Opcional)</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                         <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                         <input type="text" placeholder="Telefone ou Email" value={formData.contacts} onChange={e=>setFormData({...formData, contacts: e.target.value})} className="w-full pl-12 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                      </div>
                      <div className="relative">
                         <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                         <input type="url" placeholder="Link útil (https://...)" value={formData.links} onChange={e=>setFormData({...formData, links: e.target.value})} className="w-full pl-12 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                      </div>
                   </div>
                </div>
             </div>
             
             <button disabled={saving} type="submit" className="w-full bg-blue-500 text-white p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all flex justify-center items-center gap-2 shadow-lg border-b-4 border-blue-700">
                {saving ? <Loader2 className="animate-spin" /> : 'Guardar Informação'}
             </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {faqs.map(faq => (
            <div key={faq.id} className="bg-white border-4 border-slate-100 rounded-[30px] p-6 flex flex-col hover:border-blue-400 transition-all shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${faq.type === 'camara' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                     {faq.type === 'camara' ? 'Câmara Municipal' : 'Junta Freguesia'}
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => startEdit(faq)} className="text-slate-400 hover:text-blue-500"><Edit3 size={16}/></button>
                     <button onClick={() => handleDelete(faq.id!)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
               </div>
               
               <h4 className="font-black text-[#0a2540] text-sm mb-2">{faq.question}</h4>
               <p className="text-[11px] font-bold text-slate-500 line-clamp-3 mb-4 flex-1">{faq.answer}</p>
               
               <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 mt-auto">
                  <p className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1 mb-1"><MapPin size={12}/> {faq.concelho}</p>
                  <p className="text-[10px] font-bold text-[#0a2540] truncate">{faq.freguesia || 'Todo o Concelho'}</p>
               </div>
            </div>
          ))}
          {faqs.length === 0 && (
             <div className="col-span-full py-16 text-center bg-slate-50 rounded-[30px] border-4 border-dashed border-slate-200">
                <Search size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nenhuma informação registada no sistema.</p>
             </div>
          )}
        </div>
      </div>

      {/* SECÇÃO: GESTÃO DE ACESSOS MUNICIPAIS */}
      <div className="bg-white p-8 rounded-[40px] border-4 border-blue-500 shadow-[12px_12px_0px_#2563eb]">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-2xl border-4 border-blue-200 text-blue-600">
              <UserPlus size={28} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Acessos Municipais</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Gerir contas de Juntas e Câmaras</p>
            </div>
          </div>
          <button onClick={() => setShowUserModal(true)} className="bg-blue-500 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2">
            <Plus size={18} /> Criar Acesso
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {municipalityUsers.length > 0 ? municipalityUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-slate-50 p-5 rounded-2xl border-2 border-slate-200">
              <div>
                <p className="font-black text-[#0a2540] uppercase">{u.name || u.email}</p>
                <p className="text-[10px] font-bold text-slate-500">{u.distrito} &gt; {u.concelho} {u.freguesia ? `> ${u.freguesia}` : ''}</p>
                <span className={`text-[9px] font-black uppercase ${u.status === 'active' ? 'text-green-600' : 'text-red-500'}`}>{u.status}</span>
              </div>
              <div className="flex gap-2 items-center">
                {changingPassId === u.id ? (
                  <div className="flex gap-2 items-center">
                    <input type="password" placeholder="Nova pass" value={newPass} onChange={e => setNewPass(e.target.value)} className="p-2 border rounded-lg text-xs w-28" />
                    <button onClick={() => handleChangePassword(u.id)} className="bg-green-500 text-white p-2 rounded-lg text-[10px] font-black"><Key size={14} /></button>
                    <button onClick={() => { setChangingPassId(null); setNewPass(''); }} className="text-slate-400"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setChangingPassId(u.id)} className="bg-slate-200 text-slate-600 p-2 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100">Alterar Pass</button>
                    <button onClick={() => toggleUserStatus(u.id, u.status || 'active')} className={`p-2 rounded-lg text-[10px] font-black uppercase ${u.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                      {u.status === 'active' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          )) : (
            <p className="text-center text-slate-400 font-bold p-6">Nenhum utilizador municipal criado.</p>
          )}
        </div>
      </div>

      <MunicipalityUserModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} onSuccess={() => setShowUserModal(false)} />
    </div>
  );
};

export default AdminMunicipalities;