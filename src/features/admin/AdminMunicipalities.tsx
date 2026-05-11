// src/features/admin/AdminMunicipalities.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, addDoc, query, onSnapshot, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Building2, Plus, Trash2, Loader2, MapPin, Phone, Link2, HelpCircle, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { MunicipalityFAQ } from '../../types';
import { useStore } from '../../store/useStore';

const AdminMunicipalities: React.FC = () => {
  const { locations } = useStore();
  const [faqs, setFaqs] = useState<MunicipalityFAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    distrito: '',
    concelho: '',
    freguesia: '',
    type: 'camara' as 'camara' | 'junta',
    question: '',
    answer: '',
    contacts: '',
    links: ''
  });

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = formData.distrito ? Object.keys(locations[formData.distrito] || {}).sort() : [];
  const freguesias = formData.distrito && formData.concelho ? (locations[formData.distrito][formData.concelho] || []).sort() : [];

  useEffect(() => {
    const q = query(collection(db, 'municipalities_faqs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: any) => {
      setFaqs(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MunicipalityFAQ)));
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.distrito || !formData.concelho) return toast.error("Distrito e Concelho são obrigatórios.");
    if (!formData.question || !formData.answer) return toast.error("Pergunta e Resposta são obrigatórios.");

    setLoading(true);
    try {
      await addDoc(collection(db, 'municipalities_faqs'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      toast.success("Informação Municipal criada com sucesso!");
      setFormData({
        distrito: '', concelho: '', freguesia: '',
        type: 'camara', question: '', answer: '', contacts: '', links: ''
      });
      setShowForm(false);
    } catch (err) {
      toast.error("Erro ao criar registo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar esta informação municipal?")) return;
    try {
      await deleteDoc(doc(db, 'municipalities_faqs', id));
      toast.success("Eliminado com sucesso.");
    } catch (err) {
      toast.error("Erro ao eliminar.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500 p-4 rounded-2xl border-4 border-[#0a2540]">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Apoio ao Munícipe</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                Informações de Câmaras e Juntas de Freguesia
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className={`px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg transition-all flex items-center gap-2 border-4 ${
              showForm 
                ? 'bg-red-50 text-red-500 border-red-200' 
                : 'bg-[#0a2540] text-white border-[#0a2540] hover:bg-black'
            }`}
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Fechar Formulário' : 'Nova Informação'}
          </button>
        </div>

        {/* FORMULÁRIO DE CRIAÇÃO */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-blue-50 border-4 border-blue-100 rounded-3xl p-8 space-y-6 mb-10 animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2">
                  <MapPin size={14} /> Localização
                </label>
                <select 
                  required 
                  value={formData.distrito} 
                  onChange={e => setFormData({...formData, distrito: e.target.value, concelho: '', freguesia: ''})} 
                  className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 bg-white"
                >
                  <option value="">Selecione o Distrito</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select 
                  required 
                  disabled={!formData.distrito} 
                  value={formData.concelho} 
                  onChange={e => setFormData({...formData, concelho: e.target.value, freguesia: ''})} 
                  className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 bg-white disabled:opacity-50"
                >
                  <option value="">Selecione o Concelho</option>
                  {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                  disabled={!formData.concelho} 
                  value={formData.freguesia} 
                  onChange={e => setFormData({...formData, freguesia: e.target.value})} 
                  className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 bg-white disabled:opacity-50"
                >
                  <option value="">Freguesia (opcional - deixe vazio para todo o concelho)</option>
                  {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2">
                  <Building2 size={14} /> Tipo de Entidade
                </label>
                <select 
                  required 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as 'camara' | 'junta'})} 
                  className="w-full p-4 rounded-2xl font-black text-xs uppercase outline-none border-2 border-blue-200 focus:border-blue-500 bg-white"
                >
                  <option value="camara">Câmara Municipal</option>
                  <option value="junta">Junta de Freguesia</option>
                </select>

                <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2 mt-4">
                  <Phone size={14} /> Contactos (opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: 255 123 456 | geral@cm-exemplo.pt" 
                  value={formData.contacts} 
                  onChange={e => setFormData({...formData, contacts: e.target.value})} 
                  className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 bg-white"
                />

                <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2 mt-4">
                  <Link2 size={14} /> Links (opcional)
                </label>
                <input 
                  type="url" 
                  placeholder="https://www.cm-exemplo.pt" 
                  value={formData.links} 
                  onChange={e => setFormData({...formData, links: e.target.value})} 
                  className="w-full p-4 rounded-2xl font-bold text-xs outline-none border-2 border-blue-200 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2 flex items-center gap-2">
                <HelpCircle size={14} /> Pergunta / Título
              </label>
              <input 
                required 
                type="text" 
                placeholder="Ex: Como solicitar o cartão de estacionamento?" 
                value={formData.question} 
                onChange={e => setFormData({...formData, question: e.target.value})} 
                className="w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 border-blue-200 focus:border-blue-500 bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] tracking-widest ml-2">
                Resposta Completa
              </label>
              <textarea 
                required 
                rows={5} 
                placeholder="Escreva aqui a resposta detalhada..." 
                value={formData.answer} 
                onChange={e => setFormData({...formData, answer: e.target.value})} 
                className="w-full p-4 rounded-2xl font-bold text-sm outline-none border-2 border-blue-200 focus:border-blue-500 bg-white resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-500 text-white p-6 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-blue-600 transition-all shadow-lg flex justify-center items-center gap-3 border-b-4 border-blue-700"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> Publicar Informação Municipal</>}
            </button>
          </form>
        )}

        {/* LISTA DE FAQs MUNICIPAIS */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100 pb-2">
            Informações Publicadas ({faqs.length})
          </h4>

          {faqs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {faqs.map(faq => (
                <details key={faq.id} className="bg-white border-4 border-slate-100 rounded-2xl shadow-sm group overflow-hidden">
                  <summary className="p-5 font-black text-[#0a2540] text-sm cursor-pointer list-none flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${faq.type === 'camara' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <span className="text-[8px] font-black uppercase text-slate-400 block">
                          {faq.distrito} &gt; {faq.concelho} {faq.freguesia ? `> ${faq.freguesia}` : ''}
                        </span>
                        {faq.question}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${faq.type === 'camara' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {faq.type === 'camara' ? 'Câmara' : 'Junta'}
                      </span>
                      <ChevronDown size={18} className="text-slate-400 group-open:rotate-180 transition-transform" />
                    </div>
                  </summary>
                  <div className="p-5 pt-0 text-sm font-bold text-slate-600 leading-relaxed border-t-2 border-slate-50 mt-2 whitespace-pre-wrap">
                    {faq.answer}
                    
                    {(faq.contacts || faq.links) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                        {faq.contacts && (
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase text-[#0a2540]">
                            <Phone size={14} className="text-[#00d66f]" /> {faq.contacts}
                          </div>
                        )}
                        {faq.links && (
                          <a href={faq.links} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] font-black uppercase text-blue-500 hover:text-blue-700">
                            <Link2 size={14} /> Aceder ao Link
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-end">
                      <button 
                        onClick={() => handleDelete(faq.id!)} 
                        className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="text-center p-16 bg-slate-50 rounded-[30px] border-4 border-dashed border-slate-200">
              <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="font-black uppercase text-slate-400 text-xs">
                Nenhuma informação municipal criada.
              </p>
              <p className="text-[10px] font-bold text-slate-300 mt-2">
                Clique em "Nova Informação" para adicionar FAQs de Câmaras e Juntas de Freguesia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMunicipalities;