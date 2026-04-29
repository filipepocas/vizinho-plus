// src/features/merchant/components/MerchantCatalog.tsx

import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../config/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Package, Plus, Trash2, Tag, Image as ImageIcon, 
  Loader2, Euro, CheckCircle2, X, Edit3, Eye, Store, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { Product, User as UserProfile } from '../../../types';
import { compressImage, dataURLtoBlob } from '../../../utils/imageUtils';

interface Props {
  merchant: UserProfile;
}

const MerchantCatalog: React.FC<Props> = ({ merchant }) => {
  const { taxonomy, fetchTaxonomy } = useStore();
  const [activeTab, setActiveTab] = useState<'my_catalog' | 'competition'>('my_catalog');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [competitionProducts, setCompetitionProducts] = useState<Product[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Limite Dinâmico de Produtos
  const [maxProducts, setMaxProducts] = useState<number>(20);

  const [formData, setFormData] = useState({
    description: '', price: '', category: '', family: '', productType: '',
    hasPromo: false, promoPrice: '', promoStart: '', promoEnd: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const formatEuro = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  // Função auxiliar para lidar com as datas do Firestore
  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date(0);
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    return new Date(createdAt);
  };

  useEffect(() => {
    if (!taxonomy) fetchTaxonomy();
    
    // Carregar a configuração global para saber o limite de produtos
    const fetchConfig = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        if (configSnap.exists() && configSnap.data().maxProductsPerStore) {
          setMaxProducts(configSnap.data().maxProductsPerStore);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    };
    
    fetchConfig();
    loadProducts();
  }, [merchant.id]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      // 1. Carregar Meus Produtos (Query simples por merchantId, filtro de data e ordenação em memória)
      const qMine = query(collection(db, 'products'), where('merchantId', '==', merchant.id));
      const snapMine = await getDocs(qMine);
      let myProds = snapMine.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));
      
      myProds = myProds.filter((p: Product) => parseDate(p.createdAt) >= seteDiasAtras);
      myProds.sort((a: Product, b: Product) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
      
      setProducts(myProds);

      // 2. Carregar Produtos da Concorrência no CONCELHO (Query simples por concelho, filtro em memória)
      if (merchant.concelho) {
        const qComp = query(collection(db, 'products'), where('concelho', '==', merchant.concelho));
        const snapComp = await getDocs(qComp);
        let compProds = snapComp.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product));
        
        compProds = compProds.filter((p: Product) => p.merchantId !== merchant.id && parseDate(p.createdAt) >= seteDiasAtras);
        compProds.sort((a: Product, b: Product) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
        
        setCompetitionProducts(compProds);
      }
    } catch (err) {
      console.error("Erro ao carregar catálogo:", err);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação do Limite Dinâmico
    if (!editingProduct && products.length >= maxProducts) {
        return toast.error(`Limite de ${maxProducts} anúncios atingido. Elimine um para publicar novo.`);
    }

    if (!editingProduct && !selectedFile) return toast.error("A imagem do produto é obrigatória.");
    if (!formData.category || !formData.family || !formData.productType) return toast.error("Selecione a classificação completa.");

    setSaving(true);
    const toastId = toast.loading("A validar exclusividade...");

    try {
      // REGRA: Proteção Anti-Duplicados na mesma FREGUESIA (Query simples, validação em memória)
      if (!editingProduct || editingProduct.productType !== formData.productType) {
         const seteDiasAtras = new Date();
         seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

         const qDuplicate = query(collection(db, 'products'), where('freguesia', '==', merchant.freguesia));
         const snapDuplicate = await getDocs(qDuplicate);
         
         const hasDuplicate = snapDuplicate.docs.some((d: any) => {
            const p = d.data() as Product;
            return p.productType === formData.productType && parseDate(p.createdAt) >= seteDiasAtras;
         });
         
         if (hasDuplicate) {
            setSaving(false);
            return toast.error(`Já existe um artigo do tipo "${formData.productType}" ativo na sua Freguesia. Vá ao separador 'Concorrência' para ver quando expira.`, { id: toastId, duration: 6000 });
         }
      }

      toast.loading("A processar imagem...", { id: toastId });
      let imageUrl = editingProduct?.imageUrl || '';
      
      if (selectedFile) {
        const compressedBase64 = await compressImage(selectedFile);
        const blob = dataURLtoBlob(compressedBase64);
        const storageRef = ref(storage, `products/${merchant.id}/${Date.now()}_${selectedFile.name}`);
        const uploadSnap = await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(uploadSnap.ref);
      }

      const productData = {
        merchantId: merchant.id,
        shopName: merchant.shopName || merchant.name,
        distrito: merchant.distrito || '',
        concelho: merchant.concelho || '',
        freguesia: merchant.freguesia || '',
        coords: (merchant.latitude && merchant.longitude) ? { lat: merchant.latitude, lng: merchant.longitude } : null,
        description: formData.description,
        imageUrl: imageUrl,
        price: Number(formData.price),
        category: formData.category,
        family: formData.family,
        productType: formData.productType,
        hasPromo: formData.hasPromo,
        promoPrice: formData.hasPromo ? Number(formData.promoPrice) : null,
        promoStart: formData.hasPromo ? formData.promoStart : null,
        promoEnd: formData.hasPromo ? formData.promoEnd : null,
        createdAt: editingProduct ? editingProduct.createdAt : serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id!), productData);
        toast.success("Produto atualizado!", { id: toastId });
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success("Produto publicado com exclusividade na Freguesia!", { id: toastId });
      }
      
      setShowAddForm(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
    } catch (err) {
      console.error("Erro ao guardar produto:", err);
      toast.error("Erro ao guardar.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar este anúncio permanentemente? O lugar ficará livre para a concorrência.")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter((p: Product) => p.id !== id));
      toast.success("Anúncio removido.");
    } catch (err) {
      toast.error("Erro ao eliminar.");
    }
  };

  const resetForm = () => {
    setFormData({
      description: '', price: '', category: '', family: '', productType: '',
      hasPromo: false, promoPrice: '', promoStart: '', promoEnd: ''
    });
    setSelectedFile(null);
    setPreview('');
  };

  const startEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
        description: p.description, price: p.price.toString(), category: p.category,
        family: p.family, productType: p.productType, hasPromo: p.hasPromo,
        promoPrice: p.promoPrice?.toString() || '', promoStart: p.promoStart || '', promoEnd: p.promoEnd || ''
    });
    setPreview(p.imageUrl);
    setShowAddForm(true);
    setActiveTab('my_catalog');
  };

  const getDaysRemaining = (createdAt: any) => {
    const createdDate = parseDate(createdAt);
    const expireDate = new Date(createdDate);
    expireDate.setDate(expireDate.getDate() + 7);
    
    const diffTime = Math.abs(expireDate.getTime() - new Date().getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex gap-4 mb-6">
        <button 
            onClick={() => setActiveTab('my_catalog')} 
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-4 ${activeTab === 'my_catalog' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#00d66f]'}`}
        >
            <Package size={16} className="inline mr-2"/> O Meu Catálogo
        </button>
        <button 
            onClick={() => setActiveTab('competition')} 
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-4 ${activeTab === 'competition' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-400 border-slate-100 hover:border-amber-400'}`}
        >
            <Eye size={16} className="inline mr-2"/> Concorrência ({merchant.concelho})
        </button>
      </div>

      {activeTab === 'my_catalog' && (
        <>
            <div className="flex justify-between items-center bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="bg-[#0a2540] p-3 rounded-2xl text-[#00d66f]"><Package size={24} /></div>
                    <div>
                        <h3 className="font-black uppercase italic tracking-tighter text-[#0a2540]">Gestão de Artigos</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{products.length} de {maxProducts} anúncios ativos</p>
                    </div>
                </div>
                <button 
                onClick={() => { resetForm(); setEditingProduct(null); setShowAddForm(!showAddForm); }}
                className={`p-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all ${showAddForm ? 'bg-red-50 text-red-500' : 'bg-[#00d66f] text-[#0a2540] shadow-md hover:scale-105'}`}
                >
                {showAddForm ? <X size={18}/> : <><Plus size={18}/> Novo Anúncio</>}
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={handleSaveProduct} className="bg-white p-8 rounded-[40px] border-4 border-[#00d66f] shadow-xl space-y-6 animate-in slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                        <label className="block text-[10px] font-black uppercase text-slate-400 ml-2">Imagem do Artigo</label>
                        <div className="relative h-64 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[30px] overflow-hidden group hover:border-[#00d66f] transition-colors">
                            {preview ? (
                                <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                <ImageIcon size={48} className="mb-2" />
                                <span className="text-[10px] font-black uppercase">Clique para escolher</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <p className="text-[9px] text-slate-400 italic text-center">A imagem será comprimida automaticamente para poupar espaço.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descrição do Produto</label>
                                <input required type="text" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]" placeholder="Ex: Pão de Mafra Regional" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Preço Base (€)</label>
                                    <div className="relative">
                                        <Euro size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                                        <input required type="number" step="0.01" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full pl-10 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-[#00d66f]" />
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <button type="button" onClick={() => setFormData({...formData, hasPromo: !formData.hasPromo})} className={`w-full p-4 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${formData.hasPromo ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                        {formData.hasPromo ? 'Promoção Ativa' : 'Adicionar Promo'}
                                    </button>
                                </div>
                            </div>

                            {formData.hasPromo && (
                                <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200 space-y-4 animate-in zoom-in">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-amber-700 ml-2">Preço Promocional (€)</label>
                                        <input type="number" step="0.01" value={formData.promoPrice} onChange={e=>setFormData({...formData, promoPrice: e.target.value})} className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl font-black text-[#0a2540] outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[8px] font-black uppercase text-amber-600 ml-2">Início</label><input type="date" value={formData.promoStart} onChange={e=>setFormData({...formData, promoStart: e.target.value})} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold" /></div>
                                        <div><label className="text-[8px] font-black uppercase text-amber-600 ml-2">Fim</label><input type="date" value={formData.promoEnd} onChange={e=>setFormData({...formData, promoEnd: e.target.value})} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold" /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-[35px] border-2 border-slate-100">
                        <p className="text-[10px] font-black uppercase text-[#0a2540] mb-4 flex items-center gap-2"><Tag size={14} className="text-[#00d66f]"/> Classificação do Artigo (Exclusividade Local)</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select 
                            required value={formData.category} 
                            onChange={e=>setFormData({...formData, category: e.target.value, family: '', productType: ''})}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f]"
                            >
                                <option value="">Categoria...</option>
                                {taxonomy && Object.keys(taxonomy.categories).sort().map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                            </select>

                            <select 
                            required disabled={!formData.category} value={formData.family} 
                            onChange={e=>setFormData({...formData, family: e.target.value, productType: ''})}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                            >
                                <option value="">Família...</option>
                                {formData.category && taxonomy && Object.keys(taxonomy.categories[formData.category].families).sort().map(f => <option key={f} value={f}>{f}</option>)}
                            </select>

                            <select 
                            required disabled={!formData.family} value={formData.productType} 
                            onChange={e=>setFormData({...formData, productType: e.target.value})}
                            className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50"
                            >
                                <option value="">Tipo de Produto...</option>
                                {formData.family && taxonomy && taxonomy.categories[formData.category].families[formData.family].sort().map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <button disabled={saving} type="submit" className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-[30px] font-black uppercase text-sm shadow-xl hover:scale-[1.01] transition-all flex justify-center items-center gap-3 border-b-8 border-black/30">
                        {saving ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24}/> {editingProduct ? 'Guardar Alterações' : 'Publicar Artigo no Vizinho+'}</>}
                    </button>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map((p: Product) => (
                    <div key={p.id} className="bg-white rounded-[30px] border-4 border-slate-100 overflow-hidden flex flex-col shadow-sm group hover:border-[#0a2540] transition-all">
                        <div className="aspect-square relative overflow-hidden bg-slate-50">
                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            {p.hasPromo && (
                                <div className="absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full font-black text-[9px] uppercase shadow-lg border-2 border-white">Promoção</div>
                            )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <span className="text-[8px] font-black uppercase text-[#00d66f] tracking-widest mb-1">{p.productType}</span>
                            <h4 className="font-black text-[#0a2540] uppercase text-[11px] leading-tight mb-3 line-clamp-2 h-8">{p.description}</h4>
                            
                            <div className="mt-auto flex items-center justify-between">
                                <div>
                                    <p className={`font-black text-xl italic ${p.hasPromo ? 'text-amber-600' : 'text-[#0a2540]'}`}>
                                        {formatEuro(p.hasPromo ? p.promoPrice! : p.price)}
                                    </p>
                                    {p.hasPromo && <p className="text-[10px] font-bold text-slate-300 line-through">{formatEuro(p.price)}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEdit(p)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"><Edit3 size={14}/></button>
                                    <button onClick={() => handleDelete(p.id!)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && products.length === 0 && !showAddForm && (
                    <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-4 border-dashed border-slate-200">
                        <Package size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="font-black uppercase text-slate-300 text-xs">O seu catálogo está vazio ou os anúncios expiraram.</p>
                    </div>
                )}
            </div>
        </>
      )}

      {activeTab === 'competition' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-amber-50 p-6 rounded-[30px] border-4 border-amber-200 text-center">
             <h3 className="text-lg font-black uppercase text-amber-800 mb-2">Artigos no seu Concelho</h3>
             <p className="text-[10px] font-bold text-amber-700 max-w-lg mx-auto leading-relaxed">
               A plataforma Vizinho+ garante exclusividade por Tipo de Produto na sua Freguesia durante 7 dias. Acompanhe aqui os artigos publicados no seu Concelho e veja quando expiram para garantir o seu lugar.
             </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {competitionProducts.map((p: Product) => {
              const daysLeft = getDaysRemaining(p.createdAt);
              return (
                <div key={p.id} className="bg-white rounded-[30px] border-2 border-slate-200 overflow-hidden flex flex-col shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <div className="aspect-square relative overflow-hidden bg-slate-50">
                        <img src={p.imageUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" alt="" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col bg-slate-50">
                        <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest mb-1">{p.productType}</span>
                        <h4 className="font-bold text-slate-500 text-[10px] leading-tight mb-2 line-clamp-2 h-8">{p.description}</h4>
                        
                        <div className="mt-auto border-t border-slate-200 pt-3">
                            <p className="text-[9px] font-black uppercase text-[#0a2540] flex items-center gap-1 mb-1"><Store size={10}/> {p.shopName}</p>
                            <p className="text-[9px] font-black uppercase text-red-500 flex items-center gap-1"><Clock size={10}/> Expira em {daysLeft} dia(s)</p>
                        </div>
                    </div>
                </div>
              )
            })}

            {!loading && competitionProducts.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-200">
                    <Store size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="font-black uppercase text-slate-400 text-xs">Nenhum concorrente no seu concelho publicou artigos ainda. Aproveite!</p>
                </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MerchantCatalog;