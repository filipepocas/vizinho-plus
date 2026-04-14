import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Image as ImageIcon, LayoutTemplate, Download, Trash2, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface FlyerItem {
  id: string;
  image: string;
  description: string;
  oldPrice: string;
  price: string;
  dateStr: string;
}

const AdminMediaGenerator: React.FC = () => {
  const [mode, setMode] = useState<'flyer' | 'banner'>('flyer');
  const [bgTemplate, setBgTemplate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const [flyerHeader, setFlyerHeader] = useState('');
  const [flyerFooter, setFlyerFooter] = useState('');
  const [flyerTitle, setFlyerTitle] = useState('DESTAQUE DA SEMANA');
  const [flyerItems, setFlyerItems] = useState<FlyerItem[]>([]);

  const [bannerText, setBannerText] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBgTemplate(URL.createObjectURL(e.target.files[0]));
    }
  };

  // X3 - RESOLVIDO: Removido o ImgLy e o WebAssembly. Usa a imagem crua.
  const handleAddFlyerItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (flyerItems.length >= 6) {
      toast.error('O limite por página são 6 artigos.');
      return;
    }

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem('itemImage') as HTMLInputElement;
    const descInput = form.elements.namedItem('itemDesc') as HTMLInputElement;
    const oldPriceInput = form.elements.namedItem('itemOldPrice') as HTMLInputElement;
    const priceInput = form.elements.namedItem('itemPrice') as HTMLInputElement;
    const dateInput = form.elements.namedItem('itemDate') as HTMLInputElement;

    if (!fileInput.files || !fileInput.files[0]) {
      toast.error('Insira a imagem do produto.');
      return;
    }

    const imageUrl = URL.createObjectURL(fileInput.files[0]);

    setFlyerItems([...flyerItems, {
      id: Math.random().toString(),
      image: imageUrl,
      description: descInput.value,
      oldPrice: oldPriceInput.value,
      price: priceInput.value,
      dateStr: dateInput.value
    }]);

    form.reset();
  };

  const handleAddBannerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBannerImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleClear = () => {
    if(!window.confirm("Limpar trabalho atual?")) return;
    setFlyerItems([]); setBgTemplate(''); setFlyerHeader(''); setFlyerFooter(''); setBannerText(''); setBannerImage('');
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    toast.loading('A gerar Imagem...', { id: 'export' });
    
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: bgTemplate ? null : '#ffffff' });
      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png");
      link.download = `VizinhoPlus_${mode}_${new Date().getTime()}.png`;
      link.click();
      toast.success('Exportado!', { id: 'export' });
    } catch (error) { toast.error('Erro.', { id: 'export' }); } finally { setIsExporting(false); }
  };

  const getGridClass = () => {
    const len = flyerItems.length;
    if (len === 1) return 'grid-cols-1 grid-rows-1';
    if (len === 2) return 'grid-cols-1 grid-rows-2';
    if (len === 3 || len === 4) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-2 grid-rows-3'; 
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[40px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#00d66f] flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3 text-[#0a2540]">
            <Sparkles className="text-[#00d66f]" size={28} strokeWidth={3} /> Estúdio (Modo Simples)
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('flyer')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${mode === 'flyer' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><LayoutTemplate size={16} className="inline mr-2" /> Folhetos</button>
          <button onClick={() => setMode('banner')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${mode === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><ImageIcon size={16} className="inline mr-2" /> Banners</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl">
            <h3 className="font-black uppercase text-xs mb-4 text-slate-400">1. Fundo</h3>
            <input type="file" accept="image/*" onChange={handleTemplateUpload} className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-xs" />
          </div>

          {mode === 'flyer' && (
            <>
              <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl space-y-4">
                <input type="text" placeholder="Destaque" value={flyerTitle} onChange={e => setFlyerTitle(e.target.value)} className="w-full p-3 border-2 rounded-xl text-xs font-bold" />
                <input type="text" placeholder="Cabeçalho" value={flyerHeader} onChange={e => setFlyerHeader(e.target.value)} className="w-full p-3 border-2 rounded-xl text-xs font-bold" />
                <input type="text" placeholder="Rodapé" value={flyerFooter} onChange={e => setFlyerFooter(e.target.value)} className="w-full p-3 border-2 rounded-xl text-xs font-bold" />
              </div>
              <div className="bg-white p-6 rounded-[30px] border-4 border-[#00d66f] shadow-xl">
                <form onSubmit={handleAddFlyerItem} className="space-y-3">
                  <input name="itemImage" type="file" accept="image/*" required className="w-full p-2 border-2 rounded-xl text-[10px]" />
                  <input name="itemDesc" type="text" placeholder="Descrição" required className="w-full p-3 border-2 rounded-xl text-xs font-bold" />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="itemOldPrice" type="text" placeholder="Antigo" className="w-full p-3 border-2 rounded-xl text-xs text-red-500 font-bold" />
                    <input name="itemPrice" type="text" placeholder="Atual" required className="w-full p-3 border-2 border-[#00d66f] rounded-xl text-xs font-black" />
                  </div>
                  <button type="submit" className="w-full bg-[#0a2540] text-[#00d66f] py-4 rounded-xl font-black uppercase text-[10px]"><Plus size={16} className="inline"/> Inserir Artigo</button>
                </form>
              </div>
            </>
          )}

          {mode === 'banner' && (
            <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl space-y-4">
               <textarea placeholder="Texto do Banner" value={bannerText} onChange={e => setBannerText(e.target.value)} className="w-full p-4 border-2 rounded-xl text-sm font-bold resize-none h-32" />
               <input type="file" accept="image/*" onChange={handleAddBannerImage} className="w-full p-3 border-2 rounded-xl text-[10px]" />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleExport} disabled={isExporting} className="flex-1 bg-[#00d66f] text-[#0a2540] py-4 rounded-2xl font-black uppercase text-[10px] shadow-[4px_4px_0px_#0a2540] border-2 border-[#0a2540]"><Download size={18} className="inline"/> Exportar</button>
            <button onClick={handleClear} className="w-16 bg-red-50 text-red-500 rounded-2xl border-2 border-red-100"><Trash2 size={20} className="mx-auto"/></button>
          </div>
        </div>

        <div className="xl:col-span-2 overflow-auto bg-slate-200 p-8 rounded-[40px] border-4 border-dashed border-slate-300 flex justify-center min-h-[600px]">
          {mode === 'flyer' ? (
            <div ref={previewRef} className="relative bg-white shadow-2xl flex flex-col" style={{ width: '794px', height: '1123px', transform: 'scale(0.8)', transformOrigin: 'top center', backgroundImage: `url(${bgTemplate})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="absolute top-0 left-0 w-full p-8 flex justify-between z-20">
                <div className="bg-white p-3 rounded-2xl border-4 border-[#0a2540] w-40 flex items-center justify-center">
                   <img src={`${process.env.PUBLIC_URL}/logo-vizinho.png`} alt="Logo" className="w-full h-auto" />
                </div>
                {flyerTitle && <div className="bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-[30px] border-4 border-[#0a2540] font-black uppercase text-2xl rotate-2">{flyerTitle}</div>}
              </div>
              {flyerHeader && <div className="w-full text-center mt-36 z-10 px-10"><p className="bg-[#0a2540] text-[#00d66f] inline-block px-8 py-3 rounded-full font-black uppercase text-lg border-4 border-[#0a2540]">{flyerHeader}</p></div>}
              <div className={`flex-1 w-full p-10 grid gap-6 ${getGridClass()} z-10`}>
                {flyerItems.map(item => (
                  <div key={item.id} className="bg-white/95 backdrop-blur-sm rounded-[30px] border-4 border-[#0a2540] p-6 flex flex-col items-center justify-between text-center">
                    <img src={item.image} alt="Produto" className="max-h-[200px] w-auto mb-4" />
                    <h4 className="font-black text-[#0a2540] text-xl line-clamp-2">{item.description}</h4>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border-2">
                      {item.oldPrice && <span className="text-red-500 font-black text-xl line-through">{item.oldPrice}</span>}
                      <span className="text-[#00d66f] font-black text-4xl">{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
              {flyerFooter && <div className="w-full bg-[#0a2540] text-[#00d66f] p-8 text-center z-20 border-t-8 border-[#00d66f]"><p className="font-black uppercase">{flyerFooter}</p></div>}
            </div>
          ) : (
            <div ref={previewRef} className="relative bg-white shadow-2xl flex items-center p-12" style={{ width: '1200px', height: '630px', transform: 'scale(0.7)', transformOrigin: 'top center', backgroundImage: `url(${bgTemplate})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
               <div className="absolute top-8 left-8 bg-white p-4 rounded-3xl border-4 border-[#0a2540] w-48 z-20"><img src={`${process.env.PUBLIC_URL}/logo-vizinho.png`} alt="Logo" /></div>
               <div className="w-1/2 h-full flex flex-col justify-center pr-8 z-10 pl-8 pt-20">
                  {bannerText && <div className="bg-white/95 p-10 rounded-[40px] border-4 border-[#0a2540]"><p className="text-4xl font-black text-[#0a2540] whitespace-pre-wrap">{bannerText}</p></div>}
               </div>
               <div className="w-1/2 h-full flex items-center justify-center z-10">
                  {bannerImage && <img src={bannerImage} alt="Produto" className="max-w-full max-h-[500px]" />}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMediaGenerator;