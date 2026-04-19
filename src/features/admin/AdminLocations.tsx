import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, Save, ClipboardPaste, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { LocationsMap } from '../../types';

const AdminLocations: React.FC = () => {
  const [pasteData, setPasteData] = useState('');
  const [parsedData, setParsedData] = useState<LocationsMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadExisting = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'system', 'locations'));
        if (snap.exists() && snap.data().data) {
          setParsedData(snap.data().data);
        }
      } catch (error) {
        console.error("Erro a carregar zonas", error);
      } finally {
        setLoading(false);
      }
    };
    loadExisting();
  }, []);

  const handleParse = () => {
    if (!pasteData.trim()) return toast.error('Cole os dados do Excel primeiro.');
    
    // Separa as linhas copiadas do Excel
    const lines = pasteData.split(/\r?\n/);
    const newLocs: LocationsMap = {};
    let count = 0;

    lines.forEach(line => {
      // Separa as colunas (separadas por "Tab" quando vem do Excel)
      const parts = line.split('\t').map(s => s?.trim());
      
      // Tem que ter pelo menos 3 colunas não vazias: Distrito, Concelho, Freguesia
      if (parts.length >= 3) {
        const dist = parts[0];
        const conc = parts[1];
        const freg = parts[2];

        if (dist && conc && freg) {
          if (!newLocs[dist]) newLocs[dist] = {};
          if (!newLocs[dist][conc]) newLocs[dist][conc] = [];
          if (!newLocs[dist][conc].includes(freg)) {
            newLocs[dist][conc].push(freg);
            count++;
          }
        }
      }
    });

    if (Object.keys(newLocs).length === 0) {
      return toast.error('Não foi possível detetar dados. Certifique-se que copiou as 3 colunas do Excel sem cabeçalhos vazios.');
    }

    setParsedData(newLocs);
    toast.success(`${count} Freguesias processadas com sucesso! Verifique a pré-visualização abaixo.`);
  };

  const handleSave = async () => {
    if (!parsedData) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'locations'), {
        data: parsedData,
        updatedAt: serverTimestamp()
      });
      toast.success('Zonas gravadas e ativas na plataforma!');
      setPasteData('');
    } catch (error) {
      toast.error('Erro ao gravar as zonas na Base de Dados.');
    } finally {
      setSaving(false);
    }
  };

  const distritosCount = parsedData ? Object.keys(parsedData).length : 0;
  let concelhosCount = 0;
  let freguesiasCount = 0;

  if (parsedData) {
    Object.values(parsedData).forEach(concelhos => {
      concelhosCount += Object.keys(concelhos).length;
      Object.values(concelhos).forEach(freguesias => {
        freguesiasCount += freguesias.length;
      });
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540]">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-[#00d66f] p-4 rounded-2xl border-4 border-[#0a2540]">
            <MapPin size={28} className="text-[#0a2540]" />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">Gestão de Zonas Geográficas</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Distritos, Concelhos e Freguesias</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LADO ESQUERDO: IMPORTAR EXCEL */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase text-blue-800 mb-2">
                <AlertCircle size={16} /> Instruções de Importação
              </h4>
              <p className="text-[10px] font-bold text-blue-600 leading-relaxed">
                Abra o seu ficheiro Excel, selecione as 3 colunas (Distrito, Concelho, Freguesia) e copie os dados. Exclua a linha de cabeçalho.
                De seguida, cole dentro da caixa abaixo e clique em Processar.
              </p>
            </div>

            <textarea 
              value={pasteData}
              onChange={(e) => setPasteData(e.target.value)}
              placeholder="Cole aqui os dados do Excel..."
              className="w-full h-64 p-6 bg-slate-50 border-4 border-slate-100 rounded-3xl font-mono text-xs outline-none focus:border-[#0a2540] resize-none whitespace-pre"
            />
            
            <button 
              onClick={handleParse} 
              className="w-full bg-[#0a2540] text-white p-6 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg flex justify-center items-center gap-3 border-b-4 border-black/40"
            >
              <ClipboardPaste size={18} /> Processar Dados Colados
            </button>
          </div>

          {/* LADO DIREITO: PRÉ-VISUALIZAÇÃO E GRAVAR */}
          <div className="space-y-4 flex flex-col">
            <div className="bg-slate-50 border-4 border-slate-100 rounded-3xl p-6 flex-grow flex flex-col">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b-2 border-slate-200 pb-2">
                Pré-visualização do Sistema
              </h4>
              
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                  <Loader2 className="animate-spin mb-2" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">A carregar base de dados...</p>
                </div>
              ) : parsedData && Object.keys(parsedData).length > 0 ? (
                <div className="flex-1 overflow-y-auto pr-2 max-h-64 custom-scrollbar">
                  <div className="grid grid-cols-3 gap-2 mb-4 bg-white p-4 rounded-xl border-2 border-slate-200 text-center shadow-sm">
                    <div>
                      <p className="text-xl font-black text-[#0a2540]">{distritosCount}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Distritos</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-[#0a2540]">{concelhosCount}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Concelhos</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-[#00d66f]">{freguesiasCount}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Freguesias</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-bold text-slate-600">
                    {Object.keys(parsedData).slice(0, 5).map(dist => (
                      <div key={dist} className="bg-white p-3 rounded-xl border border-slate-200">
                        <span className="font-black text-[#0a2540] uppercase">{dist}</span>
                        <span className="text-[9px] text-slate-400 ml-2">({Object.keys(parsedData[dist]).length} Concelhos)</span>
                      </div>
                    ))}
                    {distritosCount > 5 && (
                      <p className="text-center text-[10px] text-slate-400 italic mt-2">E mais {distritosCount - 5} distritos ocultos na pré-visualização...</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                  <MapPin size={48} className="mb-4 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-center">Nenhum dado inserido</p>
                </div>
              )}
            </div>

            <button 
              onClick={handleSave} 
              disabled={saving || !parsedData}
              className="w-full bg-[#00d66f] text-[#0a2540] p-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 border-b-4 border-[#0a2540]/20"
            >
              {saving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Guardar Zonas Definitivamente</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminLocations;