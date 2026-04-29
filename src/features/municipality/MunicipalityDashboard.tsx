// src/features/municipality/MunicipalityDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useStore } from '../../store/useStore';
import { collection, addDoc, query, onSnapshot, deleteDoc, updateDoc as updateDocFirestore, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { MunicipalityFAQ } from '../../types';
import { Building2, Plus, Trash2, Edit3, Loader2, MapPin, Link2, Phone, LogOut, Lock, Save, Key, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MunicipalityDashboard: React.FC = () => {
  const { currentUser, logout, locations } = useStore();
  const navigate = useNavigate();

  const [faqs, setFaqs] = useState<MunicipalityFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const userDistrito = currentUser?.distrito || '';
  const userConcelho = currentUser?.concelho || '';
  const userFreguesia = currentUser?.freguesia || '';

  const [formData, setFormData] = useState<MunicipalityFAQ>({
    distrito: userDistrito,
    concelho: userConcelho,
    freguesia: userFreguesia,
    type: currentUser?.freguesia ? 'junta' : 'camara',
    question: '',
    answer: '',
    contacts: '',
    links: '',
    createdAt: null
  });

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showSecurityForm, setShowSecurityForm] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let q = query(collection(db, 'municipalities_faqs'), where('distrito', '==', userDistrito));
    if (userConcelho) q = query(q, where('concelho', '==', userConcelho));
    if (userFreguesia) q = query(q, where('freguesia', '==', userFreguesia));
    
    const unsubscribe = onSnapshot(q, (snap: any) => {
      setFaqs(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MunicipalityFAQ)));
      setLoading(false);
    }, (error: any) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, userDistrito, userConcelho, userFreguesia]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) return toast.error("Pergunta e Resposta são obrigatórias.");

    setSaving(true);
    try {
      const dataToSave = {
        distrito: userDistrito,
        concelho: userConcelho,
        freguesia: userFreguesia,
        type: formData.type,
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        contacts: formData.contacts?.trim() || '',
        links: formData.links?.trim() || '',
      };

      if (editingId) {
        await updateDocFirestore(doc(db, 'municipalities_faqs', editingId), { ...dataToSave, updatedAt: serverTimestamp() });
        toast.success("Informação atualizada!");
      } else {
        await addDoc(collection(db, 'municipalities_faqs'), { ...dataToSave, createdAt: serverTimestamp() });
        toast.success("Informação adicionada!");
      }
      
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      toast.error("Erro ao guardar dados. Verifique as permissões.");
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
      distrito: userDistrito,
      concelho: userConcelho,
      freguesia: userFreguesia,
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
    setFormData({
      distrito: userDistrito,
      concelho: userConcelho,
      freguesia: userFreguesia,
      type: currentUser?.freguesia ? 'junta' : 'camara',
      question: '',
      answer: '',
      contacts: '',
      links: '',
      createdAt: null
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) return toast.error("As passwords não coincidem.");
    if (newPass.length < 6) return toast.error("Mínimo 6 caracteres.");

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPass);
        toast.success("Password alterada com sucesso!");
        setNewPass('');
        setConfirmPass('');
        setShowSecurityForm(false);
      } else {
        toast.error("Sessão não encontrada.");
      }
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        toast.error("Por segurança, faça logout e entre novamente para mudar a password.");
      } else {
        toast.error("Erro ao alterar password.");
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#00d66f]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      <header className="bg-[#0a2540] p-6 text-white flex items-center justify-between border-b-8 border-blue-500 shadow-xl rounded-b-[30px]">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500 p-3 rounded-2xl">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">Painel Municipal</h1>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
              {userFreguesia ? `Junta de ${userFreguesia}` : `Câmara de ${userConcelho || userDistrito}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSecurityForm(!showSecurityForm)}
            className={`p-3 rounded-xl font-black uppercase text-[10px] flex items-center gap-2 transition-all ${showSecurityForm ? 'bg-blue-500 text-white' : 'bg-white/10 text-blue-300 hover:bg-white/20'}`}
          >
            <Lock size={16} /> Segurança
          </button>
          <button onClick={handleLogout} className="p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8 mt-8">
        {showSecurityForm && (
          <div className="bg-white rounded-[40px] border-4 border-blue-500 shadow-xl p-8 animate-in slide-in-from-top-4">
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] mb-6 flex items-center gap-2"><Key className="text-blue-500" /> Alterar Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <input required type="password" placeholder="Nova Password (mín. 6 caracteres)" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
              <input required type="password" placeholder="Confirmar Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-blue-500" />
              <button type="submit" className="w-full bg-blue-500 text-white p-4 rounded-2xl font-black uppercase text-sm shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                <Save size={18} /> Guardar Nova Password
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540] p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] flex items-center gap-3">
              <Building2 className="text-blue-500" size={28} /> Gestão de Informações
            </h2>
            <button
              onClick={() => { resetForm(); setEditingId(null); setShowForm(!showForm); }}
              className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all ${showForm ? 'bg-red-50 text-red-500' : 'bg-[#0a2540] text-white hover:bg-black'}`}
            >
              {showForm ? <X size={18} /> : <><Plus size={18} /> Adicionar FAQ</>}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSave} className="bg-slate-50 p-8 rounded-[30px] border-2 border-slate-200 mb-10 space-y-6 animate-in slide-in-from-top-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">1. Tipo de Entidade</h4>
                  <select required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'camara' | 'junta'})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm uppercase">
                    <option value="camara">Câmara Municipal</option>
                    <option value="junta">Junta de Freguesia</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">2. Informação Útil</h4>
                  <input required type="text" placeholder="Título / Tópico (Ex: Horário de Atendimento)" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                  <textarea required rows={4} placeholder="Conteúdo / Resposta..." value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm resize-none" />
                </div>

                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-200 pb-2">3. Contactos e Anexos (Opcional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="text" placeholder="Telefone ou Email" value={formData.contacts} onChange={e => setFormData({...formData, contacts: e.target.value})} className="w-full pl-12 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                    </div>
                    <div className="relative">
                      <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input type="url" placeholder="Link útil (https://...)" value={formData.links} onChange={e => setFormData({...formData, links: e.target.value})} className="w-full pl-12 p-4 rounded-2xl font-bold text-xs outline-none border-2 border-white focus:border-blue-400 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white p-6 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all flex justify-center items-center gap-2 shadow-lg border-b-4 border-blue-700">
                {saving ? <Loader2 className="animate-spin" /> : 'Guardar Informação'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-6">
            {faqs.length > 0 ? faqs.map(faq => (
              <div key={faq.id} className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${faq.type === 'camara' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {faq.type === 'camara' ? 'Câmara Municipal' : 'Junta Freguesia'}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(faq)} className="text-slate-400 hover:text-blue-500"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(faq.id!)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h4 className="font-black text-[#0a2540] text-sm mb-2">{faq.question}</h4>
                <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-4">{faq.answer}</p>
                {(faq.contacts || faq.links) && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    {faq.contacts && <p className="text-[10px] font-black uppercase text-slate-500"><Phone size={12} className="inline mr-1" /> {faq.contacts}</p>}
                    {faq.links && <a href={faq.links} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700"><Link2 size={12} className="inline mr-1" /> {faq.links}</a>}
                  </div>
                )}
              </div>
            )) : (
              <div className="py-12 text-center text-slate-400 font-black uppercase text-xs">Nenhuma FAQ criada ainda.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MunicipalityDashboard;