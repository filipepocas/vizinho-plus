// src/features/admin/AdminTaxonomy.tsx

import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Tag, Plus, Trash2, Save, Loader2, Layers, ChevronRight, ListTree, X, ClipboardPaste, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProductTaxonomy } from '../../types';

const AdminTaxonomy: React.FC = () => {
  const [taxonomy, setTaxonomy] = useState<ProductTaxonomy>({ categories: {}, updatedAt: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para importação via Excel
  const [pasteData, setPasteData] = useState('');

  // Estados para inputs de adição manual
  const [newCat, setNewCat] = useState('');
  const [newFamily, setNewFamily] = useState<{ [cat: string]: string }>({});
  const [newType, setNewType] = useState<{ [fam: string]: string }>({});

  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'system', 'products_taxonomy'));
        if (docSnap.exists()) {
          setTaxonomy(docSnap.data() as ProductTaxonomy);
        }
      } catch (err) {
        toast.error("Erro ao carregar taxonomia.");
      } finally {
        setLoading(false);
      }
    };
    fetchTaxonomy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'products_taxonomy'), {
        ...taxonomy,
        updatedAt: serverTimestamp()
      });
      toast.success("Estrutura de produtos guardada com sucesso!");
    } catch (err) {
      toast.error("Erro ao gravar dados.");
    } finally {
      setSaving(false);
    }
  };

  // LÓGICA DE IMPORTAÇÃO (EXCEL)
  const handleParseAndMerge = () => {
    if (!pasteData.trim()) return toast.error('Cole os dados do Excel primeiro.');
    
    const lines = pasteData.split(/\r?\n/);
    const updatedCats = { ...taxonomy.categories }; // Mantém as categorias que já existem
    let count = 0;

    lines.forEach(line => {
      // O Excel usa tabulação (\t) para separar colunas
      const parts = line.split('\t').map(s => s?.trim());
      
      // Precisamos de 3 colunas: Categoria, Família, Tipo
      if (parts.length >= 3) {
        const cat = parts[0];
        const fam = parts[1];
        const type = parts[2];

        if (cat && fam && type) {
          // Cria a categoria se não existir
          if (!updatedCats[cat]) updatedCats[cat] = { families: {} };
          // Cria a família se não existir
          if (!updatedCats[cat].families[fam]) updatedCats[cat].families[fam] = [];
          // Adiciona o tipo se não existir
          if (!updatedCats[cat].families[fam].includes(type)) {
            updatedCats[cat].families[fam].push(type);
            count++;
          }
        }
      }
    });

    if (count === 0) {
      return toast.error('Nenhum dado novo detetado. Certifique-se que copiou 3 colunas (Categoria, Família, Tipo).');
    }

    setTaxonomy({ ...taxonomy, categories: updatedCats });
    setPasteData('');
    toast.success(`${count} novos Tipos processados! Faça scroll para rever e clique em 'Guardar Estrutura'.`);
  };

  // LÓGICAS DE ADIÇÃO MANUAL
  const addCategory = () => {
    if (!newCat.trim()) return;
    const cat = newCat.trim();
    if (taxonomy.categories[cat]) return toast.error("Esta Categoria já existe.");
    
    setTaxonomy({
      ...taxonomy,
      categories: {
        ...taxonomy.categories,
        [cat]: { families: {} }
      }
    });
    setNewCat('');
  };

  const addFamily = (cat: string) => {
    const famName = newFamily[cat]?.trim();
    if (!famName) return;
    
    const updatedCats = { ...taxonomy.categories };
    if (updatedCats[cat].families[famName]) return toast.error("Esta Família já existe nesta Categoria.");

    updatedCats[cat].families[famName] = [];
    
    setTaxonomy({ ...taxonomy, categories: updatedCats });
    setNewFamily({ ...newFamily, [cat]: '' });
  };

  const addType = (cat: string, fam: string) => {
    const typeName = newType[fam]?.trim();
    if (!typeName) return;

    const updatedCats = { ...taxonomy.categories };
    if (!updatedCats[cat].families[fam].includes(typeName)) {
      updatedCats[cat].families[fam].push(typeName);
    } else {
      return toast.error("Este Tipo já existe nesta Família.");
    }

    setTaxonomy({ ...taxonomy, categories: updatedCats });
    setNewType({ ...newType, [fam]: '' });
  };

  // LÓGICAS DE REMOÇÃO
  const removeCategory = (cat: string) => {
    if (!window.confirm(`Apagar a categoria "${cat}" e todas as suas famílias e tipos?`)) return;
    const updatedCats = { ...taxonomy.categories };
    delete updatedCats[cat];
    setTaxonomy({ ...taxonomy, categories: updatedCats });
  };

  const removeFamily = (cat: string, fam: string) => {
    if (!window.confirm(`Apagar a família "${fam}" e todos os seus tipos?`)) return;
    const updatedCats = { ...taxonomy.categories };
    delete updatedCats[cat].families[fam];
    setTaxonomy({ ...taxonomy, categories: updatedCats });
  };

  const removeType = (cat: string, fam: string, type: string) => {
    if (!window.confirm(`Apagar o tipo "${type}"?`)) return;
    const updatedCats = { ...taxonomy.categories };
    updatedCats[cat].families[fam] = updatedCats[cat].families[fam].filter((t: string) => t !== type);
    setTaxonomy({ ...taxonomy, categories: updatedCats });
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-[#00d66f]" size={40} /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="bg-[#00d66f] p-4 rounded-2xl border-4 border-[#0a2540] text-[#0a2540]">
              <ListTree size={28} strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Gestão de Taxonomia</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configura as Categorias, Famílias e Tipos de Artigos</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-[#0a2540] text-[#00d66f] px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-105 transition-transform flex items-center gap-2 border-b-4 border-black/40">
            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} Guardar Estrutura
          </button>
        </div>

        {/* SECÇÃO DE IMPORTAÇÃO RÁPIDA (EXCEL) */}
        <div className="bg-slate-50 p-6 rounded-[30px] border-4 border-slate-100 mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="space-y-4">
             <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-800 mb-2">
                  <AlertCircle size={16} /> Importação Rápida (Excel)
                </h4>
                <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
                  Copie 3 colunas do seu ficheiro Excel (Categoria, Família, Tipo) e cole na caixa abaixo. O sistema irá organizar a árvore automaticamente sem apagar os dados existentes.
                </p>
             </div>
             <textarea 
               value={pasteData}
               onChange={(e) => setPasteData(e.target.value)}
               placeholder="Categoria &#9; Família &#9; Tipo..."
               className="w-full h-32 p-4 bg-white border-2 border-slate-200 rounded-2xl font-mono text-xs outline-none focus:border-[#0a2540] resize-none whitespace-pre"
             />
             <button 
               onClick={handleParseAndMerge} 
               className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-md flex justify-center items-center gap-2"
             >
               <ClipboardPaste size={16} /> Processar Dados Colados
             </button>
           </div>
           <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 flex flex-col justify-center items-center text-center">
               <ListTree size={48} className="text-slate-200 mb-4" />
               <p className="text-xs font-black uppercase text-slate-400">Como funciona?</p>
               <p className="text-[10px] font-bold text-slate-500 mt-2 max-w-xs leading-relaxed">
                 Os dados colados serão adicionados à árvore abaixo. Faça scroll para rever o resultado e, quando estiver satisfeito com a organização, clique no botão <strong className="text-[#0a2540]">Guardar Estrutura</strong> no topo da página.
               </p>
           </div>
        </div>

        <div className="space-y-10">
          {/* Adicionar Categoria Principal Manualmente */}
          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex gap-4 items-center">
            <Tag className="text-slate-300" />
            <input 
              type="text" 
              placeholder="Nome da Nova Categoria (Ex: Alimentação, Tecnologia...)" 
              value={newCat} 
              onChange={e => setNewCat(e.target.value)}
              className="flex-1 bg-transparent font-black uppercase text-sm outline-none focus:placeholder-transparent"
            />
            <button onClick={addCategory} className="bg-[#0a2540] text-white p-3 rounded-xl hover:bg-black transition-colors"><Plus size={20}/></button>
          </div>

          {/* Listagem da Árvore */}
          <div className="grid grid-cols-1 gap-8">
            {Object.keys(taxonomy.categories).sort().map(catName => (
              <div key={catName} className="border-4 border-[#0a2540] rounded-[35px] overflow-hidden bg-white shadow-sm">
                <div className="bg-[#0a2540] p-5 flex justify-between items-center text-white">
                  <h4 className="font-black uppercase tracking-tighter italic text-lg flex items-center gap-2">
                    <ChevronRight size={20} className="text-[#00d66f]"/> {catName}
                  </h4>
                  <button onClick={() => removeCategory(catName)} className="text-red-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Adicionar Família Manualmente */}
                  <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl">
                    <input 
                      type="text" 
                      placeholder="Adicionar Família (Ex: Laticínios)..." 
                      value={newFamily[catName] || ''} 
                      onChange={e => setNewFamily({...newFamily, [catName]: e.target.value})}
                      className="flex-1 bg-transparent font-bold text-xs outline-none pl-2"
                    />
                    <button onClick={() => addFamily(catName)} className="bg-slate-200 text-[#0a2540] p-2 rounded-lg hover:bg-[#00d66f] transition-all"><Plus size={16}/></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(taxonomy.categories[catName].families).sort().map(famName => (
                      <div key={famName} className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-100">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                          <span className="font-black uppercase text-[11px] text-[#0a2540] flex items-center gap-2">
                            <Layers size={14} className="text-[#00d66f]"/> {famName}
                          </span>
                          <button onClick={() => removeFamily(catName, famName)} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>

                        {/* Adicionar Tipo Manualmente */}
                        <div className="flex gap-2 mb-4">
                          <input 
                            type="text" 
                            placeholder="Tipo (Ex: Leite)..." 
                            value={newType[famName] || ''} 
                            onChange={e => setNewType({...newType, [famName]: e.target.value})}
                            className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-bold outline-none"
                          />
                          <button onClick={() => addType(catName, famName)} className="bg-[#0a2540] text-white p-2 rounded-lg hover:bg-black"><Plus size={14}/></button>
                        </div>

                        {/* Listagem de Tipos */}
                        <div className="flex flex-wrap gap-2">
                          {taxonomy.categories[catName].families[famName].map((typeName: string) => (
                            <span key={typeName} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase text-slate-500 flex items-center gap-2 group">
                              {typeName}
                              <X size={12} className="cursor-pointer text-red-300 hover:text-red-500" onClick={() => removeType(catName, famName, typeName)}/>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            
            {Object.keys(taxonomy.categories).length === 0 && (
              <div className="text-center p-10 border-4 border-dashed border-slate-200 rounded-[30px]">
                <p className="text-slate-400 font-black uppercase text-xs">Nenhuma categoria criada. Importe via Excel ou crie manualmente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTaxonomy;