// src/features/merchant/components/MerchantCatalog.tsx

import React, { useState, useEffect } from 'react';
import { db, storage } from '../../../config/firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Package, Plus, Trash2, Tag, Image as ImageIcon, 
  Loader2, AlertCircle, Euro, CheckCircle2, X, Edit3, Save
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState({
    description: '', price: '', category: '', family: '', productType: '',
    hasPromo: false, promoPrice: '', promoStart: '', promoEnd: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const formatEuro = (val: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val);

  useEffect(() => {
    if (!taxonomy) fetchTaxonomy();
    loadMyProducts();
  }, [merchant.id]);

  const loadMyProducts = async () => {
    setLoading(true);
    try {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const q = query(
        collection(db, 'products'), 
        where('merchantId', '==', merchant.id),
        where('createdAt', '>=', seteDiasAtras),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Product)));
    } catch (err) {
      toast.error("Erro ao carregar catálogo.");
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
    // CORREÇÃO: Limite atualizado para 20 artigos
    if (!editingProduct && products.length >= 20) {
        return toast.error("Limite de 20 anúncios atingido. Elimine um para publicar novo.");
    }
    if (!editingProduct && !selectedFile) return toast.error("A imagem do produto é obrigatória.");
    if (!formData.category || !formData.family || !formData.productType) return toast.error("Selecione a classificação completa.");

    setSaving(true);
    const toastId = toast.loading("A processar e comprimir imagem...");

    try {
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
        coords: (merchant.latitude && merchant.longitude) ? { lat: merchant.latitude, lng: merchant.longitude } : undefined,
        description: formData.description,
        imageUrl: imageUrl,
        price: Number(formData.price),
        category: formData.category,
        family: formData.family,
        productType: formData.productType,
        hasPromo: formData.hasPromo,
        promoPrice: formData.hasPromo ? Number(formData.promoPrice) : undefined,
        promoStart: formData.hasPromo ? formData.promoStart : null,
        promoEnd: formData.hasPromo ? formData.promoEnd : null,
        createdAt: editingProduct ? editingProduct.createdAt : serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id!), productData);
        toast.success("Produto atualizado!", { id: toastId });
      } else {
        await addDoc(collection(db, 'products'), productData);
        toast.success("Produto publicado!", { id: toastId });
      }
      
      setShowAddForm(false);
      setEditingProduct(null);
      resetForm();
      loadMyProducts();
    } catch (err) {
      toast.error("Erro ao guardar produto.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Eliminar este anúncio?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(products.filter(p => p.id !== id));
      toast.success("Anúncio removido.");
    } catch (err) {
      toast.error("Erro ao eliminar.");
    }
  };

  const resetForm = () => {
    setFormData({ description: '', price: '', category: '', family: '', productType: '', hasPromo: false, promoPrice: '', promoStart: '', promoEnd: '' });
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
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-lg">
         <div className="flex items-center gap-4">
            <div className="bg-[#0a2540] p-3 rounded-2xl text-[#00d66f]"><Package size={24} /></div>
            <div>
               <h3 className="font-black uppercase italic tracking-tighter text-[#0a2540]">O Meu Catálogo</h3>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{products.length} de 20 anúncios ativos</p>
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
                      {preview ? <img src={preview} className="w-full h-full object-cover" alt="Preview" /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300"><ImageIcon size={48} className="mb-2" /><span className="text-[10px] font-black uppercase">Escolher Imagem</span></div>}
                      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descrição Curta (Nome do Produto)</label>
                        <input required type="text" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-[#00d66f]" placeholder="Ex: Pão de Mafra Regional" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Preço (€)</label>
                            <div className="relative"><Euro size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/><input required type="number" step="0.01" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full pl-10 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-lg outline-none focus:border-[#00d66f]" /></div>
                        </div>
                        <div className="flex flex-col justify-end">
                            <button type="button" onClick={() => setFormData({...formData, hasPromo: !formData.hasPromo})} className={`w-full p-4 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${formData.hasPromo ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                {formData.hasPromo ? 'Promoção Ativa' : 'Adicionar Promo'}
                            </button>
                        </div>
                    </div>
                    {formData.hasPromo && (
                        <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200 space-y-4 animate-in zoom-in">
                            <div><label className="text-[10px] font-black uppercase text-amber-700 ml-2">Preço Promocional (€)</label><input type="number" step="0.01" value={formData.promoPrice} onChange={e=>setFormData({...formData, promoPrice: e.target.value})} className="w-full p-3 bg-white border-2 border-amber-300 rounded-xl font-black text-[#0a2540] outline-none" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[8px] font-black uppercase text-amber-600 ml-2">Início</label><input type="date" value={formData.promoStart} onChange={e=>setFormData({...formData, promoStart: e.target.value})} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold" /></div>
                                <div><label className="text-[8px] font-black uppercase text-amber-600 ml-2">Fim</label><input type="date" value={formData.promoEnd} onChange={e=>setFormData({...formData, promoEnd: e.target.value})} className="w-full p-2 bg-white border border-amber-200 rounded-lg text-xs font-bold" /></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-[35px] border-2 border-slate-100">
                <p className="text-[10px] font-black uppercase text-[#0a2540] mb-4 flex items-center gap-2"><Tag size={14} className="text-[#00d66f]"/> Classificação do Artigo</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select required value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value, family: '', productType: ''})} className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f]">
                        <option value="">Categoria...</option>
                        {taxonomy && Object.keys(taxonomy.categories).sort().map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                    <select required disabled={!formData.category} value={formData.family} onChange={e=>setFormData({...formData, family: e.target.value, productType: ''})} className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Família...</option>
                        {formData.category && taxonomy && Object.keys(taxonomy.categories[formData.category].families).sort().map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select required disabled={!formData.family} value={formData.productType} onChange={e=>setFormData({...formData, productType: e.target.value})} className="w-full p-4 rounded-2xl bg-white border-2 border-slate-200 font-bold text-xs outline-none focus:border-[#00d66f] disabled:opacity-50">
                        <option value="">Tipo...</option>
                        {formData.family && taxonomy && taxonomy.categories[formData.category].families[formData.family].sort().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <button disabled={saving} type="submit" className="w-full bg-[#0a2540] text-[#00d66f] p-6 rounded-[30px] font-black uppercase text-sm shadow-xl hover:scale-[1.01] transition-all flex justify-center items-center gap-3 border-b-4 border-black/30">
                {saving ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={24}/> {editingProduct ? 'Guardar Alterações' : 'Publicar Artigo'}</>}
            </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(p => (
            <div key={p.id} className="bg-white rounded-[30px] border-4 border-slate-100 overflow-hidden flex flex-col shadow-sm group hover:border-[#0a2540] transition-all">
                <div className="aspect-square relative overflow-hidden bg-slate-50">
                    <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    {p.hasPromo && <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full font-black text-[7px] uppercase shadow-lg border border-white">Oferta</div>}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                    <span className="text-[8px] font-black uppercase text-[#00d66f] tracking-widest mb-1">{p.productType}</span>
                    <h4 className="font-black text-[#0a2540] uppercase text-[11px] leading-tight mb-3 line-clamp-2 h-8">{p.description}</h4>
                    <div className="mt-auto flex items-center justify-between">
                        <p className={`font-black text-sm italic ${p.hasPromo ? 'text-red-500' : 'text-[#0a2540]'}`}>{formatEuro(p.hasPromo ? p.promoPrice! : p.price)}</p>
                        <div className="flex gap-2">
                            <button onClick={() => startEdit(p)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-500 hover:text-white"><Edit3 size={14}/></button>
                            <button onClick={() => handleDelete(p.id!)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default MerchantCatalog;