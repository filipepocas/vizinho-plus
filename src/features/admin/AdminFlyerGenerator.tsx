// src/features/admin/AdminFlyerGenerator.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { FileText, Image as ImageIcon, Settings, CheckSquare, ArrowUp, ArrowDown, Download, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MarketingRequest } from '../../types';

interface SelectedItem extends MarketingRequest {
  assignedCategory: string;
}

const AdminFlyerGenerator: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Passo 1: Templates Base
  const [bgCover, setBgCover] = useState<string>('');
  const [bgInner, setBgInner] = useState<string>('');
  const [bgBack, setBgBack] = useState<string>('');

  // Passo 2: Seleção e Categorização
  const [availableRequests, setAvailableRequests] = useState<MarketingRequest[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Passo 3: Ordenação
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  useEffect(() => {
    fetchLeafletRequests();
  }, []);

  const fetchLeafletRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'marketing_requests'),
        where('type', '==', 'leaflet'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setAvailableRequests(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MarketingRequest)));
    } catch (err) {
      toast.error('Erro ao carregar pedidos de folheto.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSelection = (req: MarketingRequest, category: string) => {
    const exists = selectedItems.find((i: SelectedItem) => i.id === req.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i: SelectedItem) => i.id !== req.id));
    } else {
      setSelectedItems([...selectedItems, { ...req, assignedCategory: category || 'Geral' }]);
    }
  };

  const prepareOrdering = () => {
    const uniqueCats = Array.from(new Set(selectedItems.map((i: SelectedItem) => i.assignedCategory)));
    setCategoryOrder(uniqueCats);
    setStep(3);
  };

  const moveCategory = (index: number, direction: -1 | 1) => {
    const newOrder = [...categoryOrder];
    if (index + direction < 0 || index + direction >= newOrder.length) return;
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;
    setCategoryOrder(newOrder);
  };

  const generatePDF = async () => {
    if (!bgCover) return toast.error('A Imagem de Capa é obrigatória.');
    
    setGenerating(true);
    toast.loading('A processar motor de paginação...', { id: 'pdf' });

    try {
      // Configuração A4 Vertical
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;

      // 1. CAPA
      doc.addImage(bgCover, 'JPEG', 0, 0, pageWidth, pageHeight);

      // 2. PÁGINAS INTERIORES (Agrupadas por Categoria)
      for (const cat of categoryOrder) {
        const itemsInCat = selectedItems.filter((i: SelectedItem) => i.assignedCategory === cat);
        
        // Paginação: 6 artigos por página (2 colunas x 3 linhas)
        const itemsPerPage = 6;
        for (let i = 0; i < itemsInCat.length; i += itemsPerPage) {
          doc.addPage();
          if (bgInner) doc.addImage(bgInner, 'JPEG', 0, 0, pageWidth, pageHeight);
          
          // Título da Categoria
          doc.setFontSize(24);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(10, 37, 64); // #0a2540
          doc.text(cat.toUpperCase(), 15, 25);

          const chunk = itemsInCat.slice(i, i + itemsPerPage);
          
          // Desenhar a Grelha
          chunk.forEach((item: SelectedItem, idx: number) => {
            const col = idx % 2; // 0 ou 1
            const row = Math.floor(idx / 2); // 0, 1 ou 2

            // Coordenadas Base da Caixa
            const x = 15 + (col * 95); 
            const y = 35 + (row * 85); 

            // Caixa Branca de Fundo do Produto
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(200, 200, 200);
            doc.roundedRect(x, y, 85, 75, 3, 3, 'FD');

            // Imagem do Produto
            if (item.imageUrl) {
              try {
                doc.addImage(item.imageUrl, 'JPEG', x + 5, y + 5, 75, 45);
              } catch (e) {
                console.warn('Erro ao embutir imagem do produto:', item.id);
              }
            }

            // Descrição
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139); // slate-500
            const splitDesc = doc.splitTextToSize(item.description || 'Produto', 75);
            doc.text(splitDesc.slice(0, 2), x + 5, y + 58); // Máximo 2 linhas

            // Preço
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 214, 111); // #00d66f
            doc.text(`${item.sellPrice} / ${item.unit}`, x + 5, y + 70);

            // Promoção Opcional
            if (item.promoPrice) {
              doc.setFontSize(10);
              doc.setTextColor(239, 68, 68); // red-500
              doc.text(`Promo: ${item.promoPrice}`, x + 50, y + 70);
            }
          });
        }
      }

      // 3. CONTRACAPA
      if (bgBack) {
        doc.addPage();
        doc.addImage(bgBack, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      // 4. GUARDAR
      doc.save(`Folheto_VizinhoPlus_${new Date().getTime()}.pdf`);
      toast.success('Folheto gerado com sucesso!', { id: 'pdf' });
      setStep(1); // Reset
      setSelectedItems([]);
      setCategoryOrder([]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o PDF. Verifique se as imagens são compatíveis.', { id: 'pdf' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-indigo-500 p-4 rounded-2xl border-4 border-[#0a2540]">
            <FileText size={28} className="text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Motor de Paginação PDF</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Construção automatizada de folhetos em A4</p>
          </div>
        </div>

        {/* PROGRESSÃO */}
        <div className="flex justify-between items-center mb-8 border-b-2 border-slate-100 pb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-4 ${step >= s ? 'bg-[#00d66f] text-[#0a2540] border-[#0a2540]' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                {s}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${step >= s ? 'text-[#0a2540]' : 'text-slate-400'}`}>
                {s === 1 ? 'Design' : s === 2 ? 'Artigos' : s === 3 ? 'Ordem' : 'Gerar'}
              </span>
            </div>
          ))}
        </div>

        {/* PASSO 1: TEMPLATES */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 mb-6">
              <p className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-2"><AlertCircle size={16}/> Resolução Recomendada</p>
              <p className="text-[10px] font-bold text-indigo-600 mt-1">Carregue imagens no formato A4 Vertical (Ex: 2480 x 3508 pixels) em JPG ou PNG.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-200 text-center hover:border-indigo-400 transition-colors">
                <p className="text-[10px] font-black uppercase text-[#0a2540] mb-4">1. Capa (Obrigatório)</p>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBgCover)} className="w-full text-[10px] font-bold" />
                {bgCover && <img src={bgCover} className="mt-4 w-full h-32 object-contain rounded-lg shadow-sm" alt="Capa" />}
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-200 text-center hover:border-indigo-400 transition-colors">
                <p className="text-[10px] font-black uppercase text-[#0a2540] mb-4">2. Fundo Interior</p>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBgInner)} className="w-full text-[10px] font-bold" />
                {bgInner && <img src={bgInner} className="mt-4 w-full h-32 object-contain rounded-lg shadow-sm" alt="Interior" />}
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border-4 border-dashed border-slate-200 text-center hover:border-indigo-400 transition-colors">
                <p className="text-[10px] font-black uppercase text-[#0a2540] mb-4">3. Contracapa</p>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setBgBack)} className="w-full text-[10px] font-bold" />
                {bgBack && <img src={bgBack} className="mt-4 w-full h-32 object-contain rounded-lg shadow-sm" alt="Contracapa" />}
              </div>
            </div>

            <button disabled={!bgCover} onClick={() => setStep(2)} className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all border-b-4 border-black/50 disabled:opacity-50">
              Avançar para Artigos
            </button>
          </div>
        )}

        {/* PASSO 2: SELEÇÃO DE ARTIGOS */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-black uppercase text-sm text-[#0a2540]">Artigos Aprovados</h4>
              <span className="bg-[#00d66f] text-[#0a2540] px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-sm">{selectedItems.length} Selecionados</span>
            </div>

            {loading ? (
              <div className="py-20 text-center"><Loader2 size={40} className="animate-spin text-indigo-500 mx-auto" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {availableRequests.map((req: MarketingRequest) => {
                  const isSelected = selectedItems.some((i: SelectedItem) => i.id === req.id);
                  const assignedCat = selectedItems.find((i: SelectedItem) => i.id === req.id)?.assignedCategory || '';

                  return (
                    <div key={req.id} className={`p-4 rounded-3xl border-4 transition-all ${isSelected ? 'border-[#00d66f] bg-green-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                      <div className="h-32 bg-white rounded-xl border-2 border-slate-100 flex items-center justify-center p-2 mb-4 overflow-hidden">
                        {req.imageUrl ? <img src={req.imageUrl} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="text-slate-300"/>}
                      </div>
                      <p className="font-black text-[10px] uppercase text-[#0a2540] truncate mb-1">{req.merchantName || req.companyName}</p>
                      <p className="font-bold text-[11px] text-slate-600 truncate mb-4">{req.description}</p>
                      
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Categoria (Ex: Talho)" 
                          className="w-full p-3 border-2 border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-400"
                          defaultValue={assignedCat}
                          onBlur={(e) => {
                            if (isSelected) {
                                setSelectedItems(selectedItems.map((i: SelectedItem) => i.id === req.id ? {...i, assignedCategory: e.target.value || 'Geral'} : i));
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                             const inputEl = document.activeElement as HTMLInputElement;
                             toggleSelection(req, inputEl?.value || 'Geral');
                          }}
                          className={`w-full py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-colors ${isSelected ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-[#0a2540] text-white hover:bg-black'}`}
                        >
                          {isSelected ? 'Remover' : 'Adicionar ao Folheto'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
              <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-500 p-6 rounded-3xl font-black uppercase text-xs hover:bg-slate-200 transition-colors">Voltar</button>
              <button disabled={selectedItems.length === 0} onClick={prepareOrdering} className="flex-1 bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase text-xs hover:bg-black transition-all border-b-4 border-black/50 disabled:opacity-50 shadow-xl">
                Avançar para Paginação
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: ORDENAÇÃO */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 mb-6">
              <p className="text-[10px] font-black uppercase text-indigo-800 flex items-center gap-2"><CheckSquare size={16}/> Organização do PDF</p>
              <p className="text-[10px] font-bold text-indigo-600 mt-1">O sistema vai criar páginas automáticas. Defina abaixo qual a Categoria que deve aparecer primeiro.</p>
            </div>

            <div className="space-y-3">
              {categoryOrder.map((cat: string, index: number) => {
                const count = selectedItems.filter((i: SelectedItem) => i.assignedCategory === cat).length;
                return (
                  <div key={cat} className="flex items-center justify-between bg-white p-4 rounded-2xl border-4 border-slate-100 shadow-sm">
                    <div>
                      <h4 className="font-black uppercase text-[#0a2540] text-sm">{cat}</h4>
                      <p className="text-[10px] font-bold text-slate-400">{count} artigos (Aprox. {Math.ceil(count / 6)} página/s)</p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={index === 0} onClick={() => moveCategory(index, -1)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-[#0a2540] hover:text-[#00d66f] transition-colors disabled:opacity-30"><ArrowUp size={16}/></button>
                      <button disabled={index === categoryOrder.length - 1} onClick={() => moveCategory(index, 1)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-[#0a2540] hover:text-[#00d66f] transition-colors disabled:opacity-30"><ArrowDown size={16}/></button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
              <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 text-slate-500 p-6 rounded-3xl font-black uppercase text-xs hover:bg-slate-200 transition-colors">Voltar</button>
              <button onClick={() => setStep(4)} className="flex-1 bg-[#0a2540] text-[#00d66f] p-6 rounded-3xl font-black uppercase text-xs hover:bg-black transition-all border-b-4 border-black/50 shadow-xl">
                Validar e Gerar
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: GERAR */}
        {step === 4 && (
          <div className="space-y-6 text-center animate-in zoom-in">
            <div className="py-12">
              <Download size={64} className="mx-auto text-[#00d66f] mb-6" />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-[#0a2540] mb-2">Tudo Pronto</h2>
              <p className="text-sm font-bold text-slate-500">
                O PDF terá a Capa, {selectedItems.length} produtos distribuídos por {categoryOrder.length} categorias e a Contracapa.
              </p>
            </div>

            <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
              <button disabled={generating} onClick={() => setStep(3)} className="flex-1 bg-slate-100 text-slate-500 p-6 rounded-3xl font-black uppercase text-xs hover:bg-slate-200 transition-colors">Cancelar</button>
              <button disabled={generating} onClick={generatePDF} className="flex-1 bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase text-sm shadow-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 border-b-4 border-[#0a2540]/20">
                {generating ? <Loader2 className="animate-spin" /> : <><Settings size={20} /> Descarregar PDF (A4)</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminFlyerGenerator;