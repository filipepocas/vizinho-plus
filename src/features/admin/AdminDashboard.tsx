// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx'; // Importar biblioteca de Excel

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'redeem'>('all');

  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');

  useEffect(() => {
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const unsubMerchants = onSnapshot(qMerchants, (s) => setMerchants(s.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsubMerchants();
  }, []);

  // FILTRAGEM
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.clientId.includes(searchQuery) || t.merchantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // FUNÇÃO DE EXPORTAÇÃO EXCEL
  const exportToExcel = () => {
    const dataToExport = filteredTransactions.map(t => ({
      Data: t.createdAt.toLocaleDateString(),
      Loja: t.merchantName,
      Cliente_ID: t.clientId,
      Tipo: t.type === 'earn' ? 'GANHO' : 'GASTO',
      Valor_Venda: t.amount.toFixed(2) + '€',
      Cashback: t.cashbackAmount.toFixed(2) + '€'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_VizinhoPlus");
    
    // Gera o ficheiro e faz download
    XLSX.writeFile(workbook, `Relatorio_VPlus_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !merchantEmail) return;
    await addDoc(collection(db, 'merchants'), {
      shopName, email: merchantEmail, createdAt: new Date(), status: 'active'
    });
    setShopName(''); setMerchantEmail('');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-vplus-blue">
      <header className="bg-vplus-blue text-white p-6 border-b-8 border-black shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Admin Command Center</h1>
            <p className="text-vplus-green text-xs font-bold mt-2 uppercase tracking-widest italic">Filipe Rocha | Gestão de Rede</p>
          </div>
          <button onClick={exportToExcel} className="bg-vplus-green border-2 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-white text-black transition-all">Exportar Excel 📊</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* BARRA DE PESQUISA */}
        <section className="lg:col-span-12 bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-grow max-w-md">
            <input 
              type="text" 
              placeholder="PESQUISAR CARTÃO OU LOJA..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-4 border-black p-2 font-black uppercase outline-none focus:bg-vplus-green-light"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'earn', 'redeem'].map((type) => (
              <button 
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-4 py-2 font-black uppercase text-xs border-2 border-black ${filterType === type ? 'bg-vplus-blue text-white' : 'bg-white text-black'}`}
              >
                {type === 'all' ? 'Ver Tudo' : type === 'earn' ? 'Ganhos' : 'Gastos'}
              </button>
            ))}
          </div>
        </section>

        {/* LISTAGEM DE TRANSAÇÕES */}
        <section className="lg:col-span-12">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 border-b-4 border-black font-black uppercase">
                  <th className="p-4">Data</th>
                  <th className="p-4">Loja</th>
                  <th className="p-4">Cartão</th>
                  <th className="p-4 text-right">Cashback</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b-2 border-gray-100 font-bold">
                    <td className="p-4">{t.createdAt.toLocaleDateString()}</td>
                    <td className="p-4 uppercase">{t.merchantName}</td>
                    <td className="p-4">{t.clientId}</td>
                    <td className={`p-4 text-right font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-500'}`}>
                      {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;