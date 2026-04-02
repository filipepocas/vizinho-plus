import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
// CORREÇÃO: Usar o import por default do módulo @imgly
import { removeBackground } from '@imgly/background-removal'; 
import { Image as ImageIcon, LayoutTemplate, Download, Trash2, Plus, Loader2, Sparkles } from 'lucide-react';
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
  const [isProcessingBg, setIsProcessingBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  // --- ESTADOS DO FOLHETO ---
  const [flyerHeader, setFlyerHeader] = useState('');
  const [flyerFooter, setFlyerFooter] = useState('');
  const [flyerTitle, setFlyerTitle] = useState('DESTAQUE DA SEMANA');
  const [flyerItems, setFlyerItems] = useState<FlyerItem[]>([]);

  // --- ESTADOS DO BANNER ---
  const [bannerText, setBannerText] = useState('');
  const [bannerImage, setBannerImage] = useState('');

  // Lógica para ler imagem do fundo do computador
  const handleTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBgTemplate(URL.createObjectURL(e.target.files[0]));
    }
  };

  // IA para remover o fundo da Imagem (CORREÇÃO DE CHAMADA APLICADA)
  const processImageBackground = async (file: File): Promise<string> => {
    setIsProcessingBg(true);
    toast.loading('A remover fundo com IA. Aguarde um pouco...', { id: 'bg-remove' });
    try {
      // Usamos a função extraída da biblioteca
      const imageBlob = await removeBackground(file);
      const url = URL.createObjectURL(imageBlob);
      toast.success('Fundo removido!', { id: 'bg-remove' });
      return url;
    } catch (error) {
      console.error(error);
      toast.error('Erro ao remover fundo. A usar imagem original.', { id: 'bg-remove' });
      return URL.createObjectURL(file); 
    } finally {
      setIsProcessingBg(false);
    }
  };

  // Adicionar Item ao Folheto
  const handleAddFlyerItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (flyerItems.length >= 6) {
      toast.error('O limite por página A4 são 6 artigos.');
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

    const imageUrl = await processImageBackground(fileInput.files[0]);

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

  // Adicionar Imagem ao Banner
  const handleAddBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = await processImageBackground(e.target.files[0]);
      setBannerImage(url);
    }
  };

  // Limpar a Memória (Apagar da App)
  const handleClear = () => {
    if(!window.confirm("Limpar todo o trabalho atual? Os ficheiros não guardados serão perdidos.")) return;
    setFlyerItems([]);
    setBgTemplate('');
    setFlyerHeader('');
    setFlyerFooter('');
    setBannerText('');
    setBannerImage('');
    toast.success('Limpo com sucesso. Espaço libertado.');
  };

  // Exportar para PNG
  const handleExport = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    toast.loading('A gerar PNG de Alta Qualidade...', { id: 'export' });
    
    try {
      const canvas = await html2canvas(previewRef.current, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: bgTemplate ? null : '#ffffff'
      });
      
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `VizinhoPlus_${mode}_${new Date().getTime()}.png`;
      link.click();
      toast.success('Exportado com sucesso!', { id: 'export' });
    } catch (error) {
      toast.error('Erro na exportação.', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Determinar organização (Grelha) com base na quantidade
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
            <Sparkles className="text-[#00d66f]" size={28} strokeWidth={3} /> Estúdio de Mídia
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Gera folhetos e banners (Não ocupa espaço online)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('flyer')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${mode === 'flyer' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><LayoutTemplate size={16} className="inline mr-2" /> Folhetos</button>
          <button onClick={() => setMode('banner')} className={`px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border-2 ${mode === 'banner' ? 'bg-[#0a2540] text-[#00d66f] border-[#0a2540]' : 'bg-slate-50 text-slate-400 border-slate-200'}`}><ImageIcon size={16} className="inline mr-2" /> Banners</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* LADO ESQUERDO: CONTROLOS */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl">
            <h3 className="font-black uppercase text-xs mb-4 text-slate-400">1. Template Base (Fundo)</h3>
            <input type="file" accept="image/*" onChange={handleTemplateUpload} className="w-full p-4 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-bold" />
          </div>

          {mode === 'flyer' && (
            <>
              <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl space-y-4">
                <h3 className="font-black uppercase text-xs mb-2 text-slate-400">2. Textos do Folheto</h3>
                <input type="text" placeholder="Destaque Superior (Ex: Especial de Páscoa)" value={flyerTitle} onChange={e => setFlyerTitle(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                <input type="text" placeholder="Cabeçalho (Informação Geral)" value={flyerHeader} onChange={e => setFlyerHeader(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                <input type="text" placeholder="Rodapé (Moradas, Condições)" value={flyerFooter} onChange={e => setFlyerFooter(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
              </div>

              <div className="bg-white p-6 rounded-[30px] border-4 border-[#00d66f] shadow-xl">
                <h3 className="font-black uppercase text-xs mb-4 text-[#0a2540]">3. Adicionar Artigo (Até 6)</h3>
                <form onSubmit={handleAddFlyerItem} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400">Imagem (A IA limpa o fundo)</label>
                    <input name="itemImage" type="file" accept="image/*" required className="w-full p-2 border-2 border-slate-100 rounded-xl text-[10px] font-bold" />
                  </div>
                  <input name="itemDesc" type="text" placeholder="Nome / Descrição" required className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <input name="itemOldPrice" type="text" placeholder="Preço Barrado (Ex: 19.99€)" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs text-red-500" />
                    <input name="itemPrice" type="text" placeholder="Preço Atual (Ex: 9.99€)" required className="w-full p-3 bg-slate-50 border-2 border-[#00d66f] rounded-xl font-black text-xs text-[#0a2540]" />
                  </div>
                  <input name="itemDate" type="text" placeholder="Válido até (Ex: 31 de Março)" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-xs" />
                  <button type="submit" disabled={isProcessingBg} className="w-full bg-[#0a2540] text-[#00d66f] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mt-2">
                    {isProcessingBg ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Inserir Artigo no Folheto
                  </button>
                </form>
              </div>
            </>
          )}

          {mode === 'banner' && (
            <div className="bg-white p-6 rounded-[30px] border-4 border-[#0a2540] shadow-xl space-y-4">
               <h3 className="font-black uppercase text-xs mb-2 text-slate-400">2. Conteúdo do Banner</h3>
               <textarea placeholder="Texto da Esquerda" value={bannerText} onChange={e => setBannerText(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-sm resize-none h-32" />
               <div>
                  <label className="text-[9px] font-black uppercase text-slate-400">Imagem da Direita (A IA limpa o fundo)</label>
                  <input type="file" accept="image/*" onChange={handleAddBannerImage} className="w-full p-3 border-2 border-slate-100 rounded-xl text-[10px] font-bold" />
               </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleExport} disabled={isExporting} className="flex-1 bg-[#00d66f] text-[#0a2540] py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-[4px_4px_0px_#0a2540] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-2 border-2 border-[#0a2540]">
              {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />} Exportar Imagem
            </button>
            <button onClick={handleClear} className="w-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center border-2 border-red-100 hover:bg-red-500 hover:text-white transition-colors" title="Limpar tudo">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* LADO DIREITO: O TEU FOLHETO / BANNER GERADO */}
        <div className="xl:col-span-2 overflow-auto bg-slate-200 p-8 rounded-[40px] border-4 border-dashed border-slate-300 flex justify-center items-center min-h-[600px]">
          
          {mode === 'flyer' ? (
            /* A4 FORMATO FOLHETO */
            <div 
              ref={previewRef}
              className="relative bg-white overflow-hidden shadow-2xl flex flex-col"
              style={{ width: '794px', height: '1123px', transform: 'scale(0.8)', transformOrigin: 'top center', backgroundImage: `url(${bgTemplate})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
              {/* TOPO: Logotipo Fixo e Titulo */}
              <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-20">
                <div className="bg-white p-3 rounded-2xl shadow-xl border-4 border-[#0a2540] w-40 flex items-center justify-center">
                   <img src={`${process.env.PUBLIC_URL}/logo-vizinho.png`} alt="Logo" className="w-full h-auto object-contain" />
                </div>
                {flyerTitle && (
                  <div className="bg-[#00d66f] text-[#0a2540] px-8 py-4 rounded-[30px] border-4 border-[#0a2540] shadow-[8px_8px_0px_#0a2540] font-black uppercase text-2xl italic tracking-tighter rotate-2">
                    {flyerTitle}
                  </div>
                )}
              </div>

              {flyerHeader && (
                <div className="w-full text-center mt-36 z-10 px-10">
                  <p className="bg-[#0a2540] text-[#00d66f] border-4 border-[#0a2540] inline-block px-8 py-3 rounded-full font-black uppercase tracking-widest text-lg shadow-xl">
                    {flyerHeader}
                  </p>
                </div>
              )}

              <div className={`flex-1 w-full p-10 grid gap-6 ${getGridClass()} mt-4 z-10`}>
                {flyerItems.map((item) => (
                  <div key={item.id} className="bg-white/95 backdrop-blur-sm rounded-[30px] border-4 border-[#0a2540] shadow-[8px_8px_0px_rgba(10,37,64,0.1)] p-6 flex flex-col items-center justify-between text-center relative overflow-hidden">
                    <img src={item.image} alt="Produto" className="flex-1 object-contain max-h-[200px] w-full mb-4 drop-shadow-xl" />
                    <div className="w-full space-y-2 mt-auto">
                      <h4 className="font-black text-[#0a2540] uppercase text-xl leading-tight line-clamp-2">{item.description}</h4>
                      <div className="flex items-center justify-center gap-3 bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                        {item.oldPrice && <span className="text-red-500 font-black text-xl line-through opacity-70">{item.oldPrice}</span>}
                        <span className="text-[#00d66f] font-black text-4xl italic tracking-tighter drop-shadow-sm">{item.price}</span>
                      </div>
                      {item.dateStr && <p className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 py-1.5 rounded-lg border-2 border-slate-200">{item.dateStr}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {flyerFooter && (
                <div className="w-full bg-[#0a2540] text-[#00d66f] p-8 text-center z-20 border-t-8 border-[#00d66f]">
                  <p className="font-black uppercase text-sm tracking-[0.2em]">{flyerFooter}</p>
                </div>
              )}
            </div>
          ) : (
            /* FORMATO BANNER */
            <div 
              ref={previewRef}
              className="relative bg-white overflow-hidden shadow-2xl flex items-center p-12"
              style={{ width: '1200px', height: '630px', transform: 'scale(0.7)', transformOrigin: 'top center', backgroundImage: `url(${bgTemplate})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
               <div className="absolute top-8 left-8 bg-white p-4 rounded-3xl shadow-xl border-4 border-[#0a2540] w-48 z-20 flex items-center justify-center">
                   <img src={`${process.env.PUBLIC_URL}/logo-vizinho.png`} alt="Logo" className="w-full h-auto object-contain" />
               </div>

               <div className="w-1/2 h-full flex flex-col justify-center pr-8 z-10 pl-8 pt-20">
                  {bannerText && (
                    <div className="bg-white/95 backdrop-blur-md p-10 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#00d66f]">
                       <p className="text-4xl font-black text-[#0a2540] uppercase italic leading-tight whitespace-pre-wrap">{bannerText}</p>
                    </div>
                  )}
               </div>

               <div className="w-1/2 h-full flex items-center justify-center z-10 relative">
                  {bannerImage && (
                    <img src={bannerImage} alt="Produto" className="max-w-full max-h-[500px] object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]" />
                  )}
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminMediaGenerator;