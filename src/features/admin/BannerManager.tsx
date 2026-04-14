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
  orderBy 
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
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  targetType: 'all' | 'zip' | 'birthday';
  targetValue?: string;
  maxImpressions?: number;
  startDate: any;
  endDate: any;
}

const BannerManager = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados do formulário
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<'all' | 'zip' | 'birthday'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [maxImpressions, setMaxImpressions] = useState('1000');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() } as Banner)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !title || !endDate) {
      toast.error("PREENCHE TODOS OS CAMPOS OBRIGATÓRIOS!");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload da Imagem
      const imageRef = ref(storage, `banners/${Date.now()}_${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // 2. Guardar no Firestore
      await addDoc(collection(db, 'banners'), {
        title: title.toUpperCase(),
        imageUrl,
        targetType,
        targetValue: targetValue.trim(),
        maxImpressions: Number(maxImpressions),
        startDate: serverTimestamp(),
        endDate: new Date(endDate),
        createdAt: serverTimestamp(),
        active: true
      });

      toast.success("BANNER CRIADO COM SUCESSO!");
      setTitle('');
      setImage(null);
      setTargetValue('');
      setEndDate('');
      fetchBanners();
    } catch (e) {
      toast.error("ERRO AO CRIAR BANNER.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ELIMINAR ESTE BANNER?")) return;
    await deleteDoc(doc(db, 'banners', id));
    toast.success("ELIMINADO.");
    fetchBanners();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* TÍTULO DA SECÇÃO */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-[#00d66f] p-3 rounded-2xl border-4 border-[#0a2540] shadow-[4px_4px_0px_0px_#0a2540]">
          <Target className="text-[#0a2540]" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#0a2540] uppercase italic tracking-tighter">Gestão de Banners</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Segmentação e Publicidade Direta</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* FORMULÁRIO DE CRIAÇÃO */}
        <div className="bg-white rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_0px_#0a2540] p-8">
          
          {/* GUIA DE DESIGN (REPLICADO DO LOJISTA) */}
          <div className="bg-[#f0f7ff] p-6 rounded-[32px] border-2 border-blue-100 mb-8">
              <p className="text-[#0a2540] text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-blue-500"/> Guia de Design Profissional
              </p>
              <ul className="space-y-2 text-[10px] text-slate-600 font-bold uppercase tracking-tight">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Resolução Ideal: <span className="text-[#0a2540]">1920 x 1080 px</span> (Proporção 16:9)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Conteúdo Seguro: <span className="text-[#0a2540]">Manter textos e produtos no CENTRO da imagem</span></li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Margens: Evite detalhes importantes nos 80px superiores e 40px inferiores</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/> Formato: Máximo 200KB (.jpg ou .webp)</li>
              </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-slate-50 border-4 border-slate-100 focus:border-[#00d66f] rounded-2xl py-4 px-6 outline-none font-black text-[#0a2540] text-xs uppercase"
                >
                  <option value="all">TODOS OS CLIENTES</option>
                  <option value="zip">POR CÓDIGO POSTAL</option>
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

            {/* CAMPOS DINÂMICOS CONFORME A ESCOLHA */}
            {targetType === 'zip' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Códigos Postais (separados por vírgula)</label>
                <input
                  type="text"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="Ex: 4000, 4400, 4150"
                  className="w-full bg-blue-50 border-4 border-blue-100 focus:border-[#00d66f] rounded-2xl py-4 px-6 outline-none font-bold text-[#0a2540] text-sm"
                />
              </div>
            )}

            {targetType === 'birthday' && (
              <div className="bg-pink-50 border-4 border-pink-100 p-5 rounded-2xl">
                <p className="text-[10px] font-black text-pink-600 uppercase flex items-center gap-2">
                  <Cake size={16} /> Este banner só aparecerá no dia de aniversário do cliente!
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-[#0a2540] ml-4 tracking-widest">Limite de Visualizações</label>
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
              disabled={uploading}
              className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-sm shadow-xl hover:bg-black active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-b-4 border-black/40 mt-4"
            >
              {uploading ? (
                <div className="w-6 h-6 border-4 border-[#00d66f] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Criar e Ativar Banner <Plus size={20} strokeWidth={3} /></>
              )}
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
              // Proteção contra Timestamps (ServerTimestamp) nulos logo após criar
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
                          banner.targetType === 'zip' ? 'bg-amber-500 border-amber-600' : 'bg-pink-500 border-pink-600'
                        }`}>
                          {banner.targetType === 'zip' ? <MapPin size={12} strokeWidth={3} /> : banner.targetType === 'birthday' ? <Cake size={12} strokeWidth={3}/> : <Users size={12} strokeWidth={3}/>}
                          {banner.targetType === 'all' ? 'VISÍVEL A TODOS' : banner.targetType === 'zip' ? `APENAS CP: ${banner.targetValue}` : 'NO ANIVERSÁRIO'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDelete(banner.id)}
                      className="mt-6 self-start bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] flex items-center gap-2 transition-all border-2 border-red-100 hover:border-red-600"
                    >
                      <Trash2 size={14} /> Eliminar Banner
                    </button>
                  </div>
                </div>
              )
            })}

            {banners.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[40px] border-4 border-dashed border-slate-200">
                <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Nenhum banner ativo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerManager;