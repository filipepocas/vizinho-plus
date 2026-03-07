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
        email: merchantEmail.toLowerCase(),
        nif: merchantNif,
        primaryColor: merchantColor,
        createdAt: new Date(),
        status: 'active'
      });
      
      alert(`Lojista ${shopName} registado com sucesso!`);
      setShopName(''); setMerchantEmail(''); setMerchantNif('');
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
      Tipo: t.type === 'earn' ? 'GANHO' : 'GASTO',
      Cashback: t.cashbackAmount.toFixed(2) + '€'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacoes");
    XLSX.writeFile(wb, "Relatorio_VizinhoPlus.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="bg-black text-white p-6 border-b-8 border-vplus-green flex justify-between items-center">
          <h1 className="text-3xl font-black uppercase italic">Admin Painel</h1>
          <button onClick={exportToExcel} className="bg-vplus-green text-black px-4 py-2 font-black uppercase text-xs">Exportar Excel</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: NOVO LOJISTA */}
          <div className="lg:col-span-4 bg-white border-4 border-black p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <h2 className="font-black uppercase mb-4 border-b-4 border-black pb-2">Novo Lojista</h2>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="NOME DA LOJA" className="w-full border-4 border-black p-3 font-black uppercase outline-none" required />
              <input type="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} placeholder="EMAIL" className="w-full border-4 border-black p-3 font-black outline-none" required />
              <input value={merchantNif} onChange={e => setMerchantNif(e.target.value)} placeholder="NIF" className="w-full border-4 border-black p-3 font-black outline-none" />
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase">Cor:</label>
                <input type="color" value={merchantColor} onChange={e => setMerchantColor(e.target.value)} className="w-10 h-10 border-2 border-black cursor-pointer" />
              </div>
              <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase border-b-4 border-black active:border-b-0 active:translate-y-1">Registar</button>
            </form>
          </div>

          {/* COLUNA DIREITA: LISTA E FILTROS */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="PROCURAR CARTÃO OU LOJA..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-grow border-4 border-black p-3 font-black uppercase outline-none"
              />
            </div>

            <div className="bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-black text-white font-black uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Loja</th>
                    <th className="p-4">Cartão</th>
                    <th className="p-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100 font-bold">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-vplus-green-light">
                      <td className="p-4">{t.createdAt.toLocaleDateString()}</td>
                      <td className="p-4 uppercase">{t.merchantName}</td>
                      <td className="p-4">{t.clientId}</td>
                      <td className={`p-4 text-right font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-600'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;