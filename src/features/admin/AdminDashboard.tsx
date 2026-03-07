// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  // Estados de Filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'earn' | 'redeem'>('all');

  // Estados de Cadastro
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');

  useEffect(() => {
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const qLogs = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(20));

    const unsubMerchants = onSnapshot(qMerchants, (s) => setMerchants(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubLogs = onSnapshot(qLogs, (s) => setAuditLogs(s.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubMerchants(); unsubLogs(); };
  }, []);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !merchantEmail) return;
    await addDoc(collection(db, 'merchants'), {
      shopName, email: merchantEmail, nif: merchantNif,
      logoUrl: 'https://via.placeholder.com/150', createdAt: new Date(), status: 'active'
    });
    setShopName(''); setMerchantEmail(''); setMerchantNif('');
    alert("Loja adicionada!");
  };

  // LÓGICA DE FILTRAGEM MOLECULAR
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.clientId.includes(searchQuery) || t.merchantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-vplus-blue">
      <header className="bg-vplus-blue text-white p-6 border-b-8 border-black shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Admin Command Center</h1>
            <p className="text-vplus-green text-xs font-bold mt-2 uppercase tracking-widest italic">Filipe Rocha | Gestão de Rede</p>
          </div>
          <button onClick={() => window.location.href='/login'} className="bg-red-500 border-2 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)]">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* BARRA DE PESQUISA E FILTROS */}
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

        {/* COLUNA ESQUERDA: CADASTRO */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black uppercase mb-4 border-b-4 border-vplus-blue pb-2 italic">Novo Lojista</h3>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="NOME COMERCIAL" className="w-full border-4 border-black p-3 font-black uppercase outline-none" />
              <input value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} placeholder="EMAIL ACESSO" className="w-full border-4 border-black p-3 font-black outline-none" />
              <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase border-b-4 border-black active:border-b-0 hover:bg-vplus-green hover:text-vplus-blue transition-all">Registar</button>
            </form>
          </div>
        </aside>

        {/* COLUNA DIREITA: TABELA DINÂMICA */}
        <section className="lg:col-span-8 space-y-8">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-black text-white p-3 font-black uppercase text-xs tracking-widest flex justify-between">
              <span>Transações Filtradas</span>
              <span>{filteredTransactions.length} Resultados</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b-4 border-black font-black uppercase">
                    <th className="p-4">Data</th>
                    <th className="p-4">Loja</th>
                    <th className="p-4">Cartão</th>
                    <th className="p-4 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-vplus-green-light transition-colors">
                      <td className="p-4 font-mono">{t.createdAt.toLocaleDateString()}</td>
                      <td className="p-4 uppercase font-bold">{t.merchantName}</td>
                      <td className="p-4 font-mono font-black">{t.clientId}</td>
                      <td className={`p-4 text-right font-black text-lg ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="p-10 text-center font-black uppercase text-gray-400 italic">Nenhum registo encontrado com estes filtros.</div>
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminDashboard;