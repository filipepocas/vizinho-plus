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
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'redeem'>('all');

  // Estados para o formulário de novo lojista
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');
  const [merchantColor, setMerchantColor] = useState('#1C305C');

  useEffect(() => {
    // Escuta em tempo real a coleção de lojistas
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const unsubMerchants = onSnapshot(qMerchants, (s) => {
      setMerchants(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubMerchants();
  }, []);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !merchantEmail) return alert("Preencha os campos obrigatórios.");

    try {
      await addDoc(collection(db, 'merchants'), {
        shopName,
        email: merchantEmail.toLowerCase().trim(),
        nif: merchantNif,
        primaryColor: merchantColor,
        createdAt: new Date(),
        status: 'active' // Define como ativo por padrão
      });
      
      alert(`Lojista ${shopName} registado com sucesso!`);
      setShopName(''); setMerchantEmail(''); setMerchantNif('');
    } catch (error) {
      alert("Erro ao registar na base de dados.");
    }
  };

  // Lógica de Filtragem de Transações
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
      Tipo: t.type === 'earn' ? 'GANHO' : 'GASTO',
      Cashback: t.cashbackAmount.toFixed(2) + '€'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, `Relatorio_VPlus_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono p-4 lg:p-8 text-vplus-blue">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER COM BOTÃO DE EXPORTAÇÃO */}
        <header className="bg-black text-white p-6 border-b-8 border-vplus-green flex flex-wrap justify-between items-center gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div>
            <h1 className="text-3xl font-black uppercase italic leading-none">Admin Command Center</h1>
            <p className="text-[10px] font-bold text-vplus-green mt-1 uppercase tracking-widest">Filipe Rocha | Gestor de Rede</p>
          </div>
          <button 
            onClick={exportToExcel} 
            className="bg-vplus-green text-black px-6 py-3 font-black uppercase text-sm border-4 border-black shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] hover:bg-white transition-all"
          >
            Exportar Excel 📊
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: NOVO LOJISTA & ESTADO DA REDE */}
          <aside className="lg:col-span-4 space-y-8">
            {/* FORMULÁRIO */}
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <h2 className="font-black uppercase mb-4 border-b-4 border-black pb-2 italic text-lg">Registar Loja</h2>
              <form onSubmit={handleAddMerchant} className="space-y-4">
                <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="NOME COMERCIAL" className="w-full border-4 border-black p-3 font-black uppercase outline-none" required />
                <input type="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} placeholder="EMAIL DE ACESSO" className="w-full border-4 border-black p-3 font-black outline-none" required />
                <input value={merchantNif} onChange={e => setMerchantNif(e.target.value)} placeholder="NIF DA EMPRESA" className="w-full border-4 border-black p-3 font-black outline-none" />
                <div className="flex items-center gap-4 p-2 bg-gray-50 border-2 border-dashed border-black">
                  <label className="text-xs font-black uppercase">Cor da Marca:</label>
                  <input type="color" value={merchantColor} onChange={e => setMerchantColor(e.target.value)} className="w-12 h-8 border-2 border-black cursor-pointer" />
                </div>
                <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase border-b-8 border-black active:border-b-0 active:translate-y-2 transition-all hover:bg-black">Criar Conta Lojista</button>
              </form>
            </div>

            {/* LISTA DE LOJISTAS (O "BOTÃO DE PÂNICO" VISUAL) */}
            <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
              <h2 className="font-black uppercase mb-4 border-b-4 border-black pb-2 italic text-lg">Estado da Rede</h2>
              <div className="space-y-3">
                {merchants.map((m) => (
                  <div key={m.id} className="border-2 border-black p-3 flex justify-between items-center bg-gray-50">
                    <div className="overflow-hidden">
                      <p className="font-black uppercase truncate text-sm">{m.shopName}</p>
                      <p className="text-[9px] font-bold opacity-50 truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-3 h-3 border-2 border-black ${m.status === 'active' ? 'bg-vplus-green' : 'bg-red-500'}`}></span>
                      <p className="text-[9px] font-black uppercase">{m.status}</p>
                    </div>
                  </div>
                ))}
                {merchants.length === 0 && <p className="text-xs italic opacity-50 text-center py-4">Sem lojas ativas.</p>}
              </div>
            </div>
          </aside>

          {/* COLUNA DIREITA: AUDITORIA DE MOVIMENTOS */}
          <section className="lg:col-span-8 space-y-6">
            {/* BARRA DE PESQUISA */}
            <div className="flex flex-wrap gap-4 items-center bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <input 
                type="text" 
                placeholder="PESQUISAR CLIENTE OU ESTABELECIMENTO..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-grow border-4 border-black p-3 font-black uppercase outline-none focus:bg-vplus-green-light"
              />
              <div className="flex gap-2">
                {['all', 'earn', 'redeem'].map((type) => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type as any)}
                    className={`px-4 py-2 font-black uppercase text-[10px] border-2 border-black ${filterType === type ? 'bg-black text-white' : 'bg-white'}`}
                  >
                    {type === 'all' ? 'Tudo' : type === 'earn' ? 'Ganhos' : 'Gastos'}
                  </button>
                ))}
              </div>
            </div>

            {/* TABELA DE MOVIMENTOS */}
            <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black text-white font-black uppercase italic">
                    <tr>
                      <th className="p-4">Data</th>
                      <th className="p-4">Estabelecimento</th>
                      <th className="p-4">ID Cartão</th>
                      <th className="p-4 text-right">Valor C/B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-100 font-bold">
                    {filteredTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-vplus-green-light transition-colors">
                        <td className="p-4 font-mono">{t.createdAt.toLocaleDateString()}</td>
                        <td className="p-4 uppercase">{t.merchantName}</td>
                        <td className="p-4 font-mono">{t.clientId}</td>
                        <td className={`p-4 text-right font-black text-sm ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-600'}`}>
                          {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTransactions.length === 0 && (
                <div className="p-12 text-center font-black uppercase text-gray-400 italic">Nenhum registo encontrado.</div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;