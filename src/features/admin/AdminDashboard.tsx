// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'redeem' | 'subtract'>('all');

  // ESTADOS DO FORMULÁRIO (CONFORME CHECKLIST)
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('10'); // Padrão 10%
  const [merchantColor, setMerchantColor] = useState('#1C305C');

  useEffect(() => {
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const unsubMerchants = onSnapshot(qMerchants, (s) => {
      setMerchants(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubMerchants();
  }, []);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !merchantEmail || !merchantNif) {
      return alert("Campos obrigatórios: Nome, Email e NIF.");
    }

    try {
      await addDoc(collection(db, 'merchants'), {
        shopName,
        email: merchantEmail.toLowerCase().trim(),
        nif: merchantNif,
        cashbackPercent: parseFloat(cashbackPercent),
        primaryColor: merchantColor,
        operators: [], // Inicia vazio, o lojista adiciona depois
        status: 'active',
        createdAt: new Date()
      });
      
      alert(`Lojista ${shopName} registado com sucesso!`);
      setShopName(''); setMerchantEmail(''); setMerchantNif(''); setCashbackPercent('10');
    } catch (error) {
      alert("Erro ao registar na base de dados.");
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.clientId.includes(searchQuery) || t.merchantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      Data: t.createdAt.toLocaleDateString(),
      Loja: t.merchantName,
      Cartão: t.clientId,
      Tipo: t.type === 'earn' ? 'ADICIONADO' : t.type === 'subtract' ? 'SUBTRAÍDO' : 'DESCONTADO',
      Cashback: t.cashbackAmount.toFixed(2) + '€',
      Documento: t.docNumber || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes_VPlus");
    XLSX.writeFile(wb, `Auditoria_VPlus_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono p-4 lg:p-8 text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER BRUTALISTA */}
        <header className="bg-black text-white p-6 border-b-8 border-vplus-green flex flex-wrap justify-between items-center gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div>
            <h1 className="text-3xl font-black uppercase italic leading-none">V+ ADMIN PANEL</h1>
            <p className="text-[10px] font-bold text-vplus-green mt-1 uppercase tracking-widest">Controlo de Rede e Lojistas</p>
          </div>
          <button onClick={exportToExcel} className="bg-vplus-green text-black px-6 py-3 font-black uppercase text-sm border-4 border-black shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] hover:bg-white transition-all">
            Exportar Auditoria 📊
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: REGISTO DE LOJISTA (AJUSTADO AO PDF) */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <h2 className="font-black uppercase mb-4 border-b-4 border-black pb-2 italic text-lg">Criar Nova Loja</h2>
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase">Nome da Loja</label>
                  <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border-4 border-black p-3 font-black uppercase outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase">E-mail de Acesso</label>
                  <input type="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="w-full border-4 border-black p-3 font-black outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase">NIF</label>
                  <input value={merchantNif} onChange={e => setMerchantNif(e.target.value)} className="w-full border-4 border-black p-3 font-black outline-none" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase">% de Cashback</label>
                  <input type="number" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} className="w-full border-4 border-black p-3 font-black outline-none" required />
                </div>
                <div className="flex items-center gap-4 p-2 bg-gray-50 border-2 border-dashed border-black">
                  <label className="text-[10px] font-black uppercase">Cor Principal:</label>
                  <input type="color" value={merchantColor} onChange={e => setMerchantColor(e.target.value)} className="w-12 h-8 border-2 border-black cursor-pointer" />
                </div>
                <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase border-b-8 border-black active:border-b-0 active:translate-y-2 transition-all">
                  Validar e Criar
                </button>
              </form>
            </div>

            {/* ESTADO DA REDE */}
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <h2 className="font-black uppercase mb-4 border-b-4 border-black pb-2 italic text-lg">Lojistas Ativos</h2>
              <div className="space-y-3">
                {merchants.map((m) => (
                  <div key={m.id} className="border-2 border-black p-3 flex justify-between items-center bg-gray-50">
                    <div className="overflow-hidden">
                      <p className="font-black uppercase text-sm">{m.shopName}</p>
                      <p className="text-[9px] font-bold opacity-50 italic">Cashback: {m.cashbackPercent}%</p>
                    </div>
                    <span className={`w-3 h-3 border-2 border-black ${m.status === 'active' ? 'bg-vplus-green' : 'bg-red-500'}`}></span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* COLUNA DIREITA: LISTA DE MOVIMENTOS REAIS */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap gap-4 items-center bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <input 
                type="text" 
                placeholder="PROCURAR POR CARTÃO OU ESTABELECIMENTO..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-grow border-4 border-black p-3 font-black uppercase outline-none focus:bg-vplus-green-light"
              />
            </div>

            <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-white font-black uppercase italic">
                  <tr>
                    <th className="p-4 border-r border-gray-800">Data</th>
                    <th className="p-4 border-r border-gray-800">Loja</th>
                    <th className="p-4 border-r border-gray-800">Nº Cartão</th>
                    <th className="p-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100 font-bold">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-vplus-green-light transition-colors">
                      <td className="p-4 border-r border-gray-100">{t.createdAt.toLocaleDateString()}</td>
                      <td className="p-4 border-r border-gray-100 uppercase">{t.merchantName}</td>
                      <td className="p-4 border-r border-gray-100 font-mono">{t.clientId}</td>
                      <td className={`p-4 text-right font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-600'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;