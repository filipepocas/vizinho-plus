// src/features/admin/BannerManager.tsx

import React, { useState, useEffect } from 'react';
import { db, storage } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Target, 
  Users, 
  MapPin, 
  Cake, 
  Calendar,
  AlertCircle,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Banner } from '../../types';
import { useStore } from '../../store/useStore';

const BannerManager = () => {
  const { locations } = useStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<'all' | 'birthday' | 'zonas'>('all');
  const [maxImpressions, setMaxImpressions] = useState('1000');
  const [endDate, setEndDate] = useState('');

  // Estados Geográficos
  const [distrito, setDistrito] = useState('');
  const [concelho, setConcelho] = useState('');
  const [freguesia, setFreguesia] = useState('');

  // Estados de Simulação/Confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [simulatedCount, setSimulatedCount] = useState(0);

  const distritos = Object.keys(locations || {}).sort();
  const concelhos = distrito ? Object.keys(locations[distrito] || {}).sort() : [];
  const freguesias = distrito && concelho ? (locations[distrito][concelho] || []).sort() : [];

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setBanners(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Banner)));
  };

  // Função para simular audiência antes de gravar
  const handleStartCreation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !title || !endDate) return toast.error("PREENCHA TODOS OS CAMPOS!");
    if (targetType === 'zonas' && !distrito) return toast.error("SELECIONE PELO MENOS O DISTRITO.");

    setLoading(true);
    try {
      // Simulação de audiência baseada em clientes ativos
      const q = query(collection(db, 'users'), where('role', '==', 'client'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      let clients = snap.docs.map((d: any) => d.data());

      if (targetType === 'zonas') {
        if (freguesia) clients = clients.filter((c: any) => c.freguesia === freguesia);
        else if (concelho) clients = clients.filter((c: any) => c.concelho === concelho);
        else if (distrito) clients = clients.filter((c: any) => c.distrito === distrito);
      } else if (targetType === 'birthday') {
        const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
        clients = clients.filter((c: any) => c.birthDate && c.birthDate.split('-')[1] === currentMonth);
      }

      setSimulatedCount(clients.length);
      setShowConfirm(true);
    } catch (err) {
      toast.error("Erro ao calcular audiência.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalPublish = async () => {
    if (!image) return;
    setUploading(true);
    try {
      // 1. Upload da Imagem
      const imageRef = ref(storage, `banners/${Date.now()}_${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // 2. Definir valor do target
      let targetValue = 'Global';
      if (targetType === 'zonas') {
        targetValue = distrito;
        if (concelho) targetValue += ` > ${concelho}`;
        if (freguesia) targetValue += ` > ${freguesia}`;
      } else if (targetType === 'birthday') {
        targetValue = 'Aniversariantes do Mês';
      }

      // 3. Guardar no Firestore
      await addDoc(collection(db, 'banners'), {
        title: title.toUpperCase(),
        imageUrl,
        targetType,
        targetValue,
        maxImpressions: Number(maxImpressions),
        startDate: serverTimestamp(),
        endDate: new Date(endDate),
        createdAt: serverTimestamp(),
        active: true,
        // Guardar campos geográficos para filtros na App
        distrito: distrito || null,
        concelho: concelho || null,
        freguesia: freguesia || null
      });

      toast.success("BANNER PUBLICADO!");
      resetForm();
      fetchBanners();
    } catch (e) {
      toast.error("ERRO AO CRIAR BANNER.");
    } finally {
      setUploading(false);
      setShowConfirm(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setImage(null);
    setEndDate('');
    setDistrito('');
    setConcelho('');
    setFreguesia('');
    setTargetType('all');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ELIMINAR ESTE BANNER?")) return;
    await deleteDoc(doc(db, 'banners', id));
    toast.success("ELIMINADO.");
    fetchBanners();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-[#00d66f] p-3 rounded-2xl border-4 border-[#0a2540] shadow-[4px_4px_0px_0px_#0a2540]">
          <Target className="text-[#0a2540]" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">Gestão de Banners</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Segmentação Local e Publicidade Direta</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* FORMULÁRIO DE CRIAÇÃO */}
        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8">
          
          <form onSubmit={handleStartCreation} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Título do Banner</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="EX: PROMOÇÃO DE VERÃO"
                className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-2xl py-4 px-6 outline-none transition-all font-bold uppercase text-[#0a2540] text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Quem vai ver?</label>
                <select 
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value as any);
                    setDistrito(''); setConcelho(''); setFreguesia('');
                  }}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-2xl py-4 px-6 outline-none font-black text-[#0a2540] text-xs uppercase"
                >
                  <option value="all">TODOS OS CLIENTES</option>
                  <option value="zonas">POR ÁREA GEOGRÁFICA</option>
                  <option value="birthday">ANIVERSARIANTES</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Validade até</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-2xl py-4 px-6 outline-none font-bold text-[#0a2540] text-sm"
                />
              </div>
            </div>

            {/* SELEÇÃO GEOGRÁFICA */}
            {targetType === 'zonas' && (
              <div className="p-6 bg-blue-50 border-4 border-blue-100 rounded-[32px] space-y-4 animate-in slide-in-from-top-2">
                <p className="text-[10px] font-black uppercase text-blue-800 ml-2">Defina o alcance local:</p>
                <select value={distrito} onChange={e=>{setDistrito(e.target.value); setConcelho(''); setFreguesia('');}} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-xs outline-none">
                  <option value="">SELECIONE DISTRITO...</option>
                  {distritos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select disabled={!distrito} value={concelho} onChange={e=>{setConcelho(e.target.value); setFreguesia('');}} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-xs outline-none disabled:opacity-50">
                  <option value="">TODO O DISTRITO (Ou escolha Concelho)</option>
                  {concelhos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select disabled={!concelho} value={freguesia} onChange={e=>setFreguesia(e.target.value)} className="w-full p-4 bg-white border-2 border-blue-200 rounded-2xl font-bold text-xs outline-none disabled:opacity-50">
                  <option value="">TODO O CONCELHO (Ou escolha Freguesia)</option>
                  {freguesias.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Limite de Impressões</label>
              <div className="relative">
                <Eye className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="number"
                  value={maxImpressions}
                  onChange={(e) => setMaxImpressions(e.target.value)}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-2xl py-4 pl-14 pr-6 outline-none font-bold text-[#0a2540] text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Imagem do Banner</label>
              <div className="relative border-4 border-dashed border-slate-200 rounded-3xl p-8 hover:border-[#00d66f] transition-colors text-center bg-slate-50">
                <input
                  type="file"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                />
                <ImageIcon className={`mx-auto mb-2 ${image ? 'text-[#00d66f]' : 'text-slate-300'}`} size={32} />
                <p className={`text-xs font-black uppercase tracking-widest ${image ? 'text-[#0a2540]' : 'text-slate-400'}`}>
                  {image ? image.name : 'Clica para escolher a imagem'}
                </p>
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm shadow-xl hover:bg-black active:translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-b-4 border-black/40 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Criar e Ativar Banner <Plus size={20} strokeWidth={3} /></>}
            </button>
          </form>
        </div>

        {/* LISTA DE BANNERS ATIVOS */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-[#0a2540] uppercase italic tracking-tighter mb-6 flex items-center gap-3">
            <Calendar className="text-[#00d66f]" size={24} /> Banners Ativos ({banners.length})
          </h3>
          
          <div className="grid gap-6 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar pb-10">
            {banners.map(banner => {
              const end = banner.endDate && typeof banner.endDate.toDate === 'function' ? banner.endDate.toDate() : new Date();

              return (
                <div key={banner.id} className="bg-white border-4 border-[#0a2540] rounded-[32px] overflow-hidden shadow-[8px_8px_0px_0px_#0a2540] flex flex-col sm:flex-row group hover:-translate-y-1 transition-transform">
                  <div className="w-full sm:w-40 h-40 bg-slate-100 flex items-center justify-center overflow-hidden border-r-4 border-transparent sm:border-slate-100">
                    <img src={banner.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-lg uppercase italic text-[#0a2540] leading-none mb-3">{banner.title}</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase border-2 border-slate-200">
                          Válido até: {end.toLocaleDateString()}
                        </span>
                        <span className={`text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase flex items-center gap-1.5 shadow-sm border-2 ${
                          banner.targetType === 'all' ? 'bg-blue-500 border-blue-600' : 
                          banner.targetType === 'zonas' ? 'bg-amber-500 border-amber-600' : 'bg-pink-500 border-pink-600'
                        }`}>
                          {banner.targetType === 'zonas' ? <MapPin size={12} strokeWidth={3} /> : banner.targetType === 'birthday' ? <Cake size={12} strokeWidth={3}/> : <Users size={12} strokeWidth={3}/>}
                          {banner.targetValue}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(banner.id)} className="mt-6 self-start bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] flex items-center gap-2 transition-all border-2 border-red-100 hover:border-red-600"><Trash2 size={14} /> Eliminar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE AUDIÊNCIA */}
      {showConfirm && (
        <div className="fixed inset-0 z-[250] bg-[#0a2540]/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#00d66f] shadow-2xl p-10 text-center animate-in zoom-in">
            <div className="bg-[#00d66f]/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users size={40} className="text-[#00d66f]" />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Validar Audiência</h3>
            <p className="text-sm font-bold text-slate-500 mb-8">
              Este banner será visível para <span className="text-[#0a2540] text-xl font-black">{simulatedCount}</span> clientes ativos na zona selecionada.
            </p>
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleFinalPublish} 
                disabled={uploading}
                className="w-full bg-[#0a2540] text-white p-6 rounded-2xl font-black uppercase tracking-widest text-xs flex justify-center items-center gap-2 shadow-xl hover:bg-black transition-all border-b-8 border-black/40"
              >
                {uploading ? <RefreshCw className="animate-spin" /> : <><CheckCircle2 size={18}/> Validar e Publicar</>}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full bg-slate-100 text-slate-400 p-4 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all"
              >
                <RefreshCw size={14} className="inline mr-1" /> Corrigir Dados
              </button>
              <button 
                onClick={() => { setShowConfirm(false); resetForm(); }}
                className="w-full bg-red-50 text-red-500 p-4 rounded-2xl font-black uppercase text-[10px] hover:bg-red-500 hover:text-white transition-all"
              >
                <XCircle size={14} className="inline mr-1" /> Cancelar Criação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;