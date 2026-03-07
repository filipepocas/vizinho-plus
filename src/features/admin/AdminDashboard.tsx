// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'merchants' | 'clients'>('transactions');
  
  // ESTADOS DO FORMULÁRIO DE CRIAÇÃO (RECUPERADOS)
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('10');
  const [merchantColor, setMerchantColor] = useState('#1C305C');

  // ESTADO DE PESQUISA
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const unsubMerchants = onSnapshot(qMerchants, (s) => {
      setMerchants(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qClients = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));
    const unsubClients = onSnapshot(qClients, (s) => {
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMerchants(); unsubClients(); };
  }, []);

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'merchants'), {
        shopName,
        email: merchantEmail.toLowerCase().trim(),
        nif: merchantNif,
        cashbackPercent: parseFloat(cashbackPercent),
        primaryColor: merchantColor,
        operators: [],
        status: 'active',
        createdAt: new Date()
      });
      alert(`Lojista ${shopName} criado!`);
      setShopName(''); setMerchantEmail(''); setMerchantNif('');
    } catch (error) {
      alert("Erro ao criar lojista.");
    }
  };

  const toggleMerchantStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateDoc(doc(db, 'merchants', id), { status: newStatus });
  };

  const exportAuditoria = () => {
    const data = transactions.map(t => ({
      Data: t.createdAt.toLocaleString(),
      Loja: t.merchantName,
      Cartao: t.clientId,
      Tipo: t.type.toUpperCase(),
      Venda: t.amount + '€',
      Cashback: t.cashbackAmount.toFixed(2) + '€',
      Doc: t.docNumber,
      Operador: t.operatorName
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VPlus_Auditoria");
    XLSX.writeFile(wb, `Auditoria_VPlus_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-black p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="bg-black text-white p-6 border-b-8 border-vplus-green flex flex-wrap justify-between items-center shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div>
            <h1 className="text-4xl font-black uppercase italic">V+ ADMIN CONTROL</h1>
            <p className="text-[10px] font-bold text-vplus-green mt-1">SESSÃO: ROCHAP.FILIPE@GMAIL.COM</p>
          </div>
          <button onClick={exportAuditoria} className="bg-vplus-green text-black px-8 py-4 font-black uppercase border-4 border-black hover:bg-white transition-all">
            Exportar Excel 📊
          </button>
        </header>

        <nav className="flex border-8 border-black bg-white overflow-hidden shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <button onClick={() => setActiveTab('transactions')} className={`flex-1 p-4 font-black uppercase ${activeTab === 'transactions' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>Transações</button>
          <button onClick={() => setActiveTab('merchants')} className={`flex-1 p-4 font-black uppercase border-x-8 border-black ${activeTab === 'merchants' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>Lojistas</button>
          <button onClick={() => setActiveTab('clients')} className={`flex-1 p-4 font-black uppercase ${activeTab === 'clients' ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>Clientes</button>
        </nav>

        <div className="bg-white border-8 border-black p-6 shadow-[12px_12px_0_0_rgba(0,0,0,1)]">
          
          {activeTab === 'merchants' && (
            <div className="space-y-8">
              {/* FORMULÁRIO DE CRIAÇÃO (REPOSTO) */}
              <div className="bg-gray-50 border-4 border-dashed border-black p-6">
                <h3 className="font-black uppercase mb-4 italic underline">Registar Novo Lojista</h3>
                <form onSubmit={handleAddMerchant} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input placeholder="NOME DA LOJA" value={shopName} onChange={e => setShopName(e.target.value)} className="p-3 border-4 border-black font-black uppercase text-xs" required />
                  <input placeholder="EMAIL" type="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="p-3 border-4 border-black font-black text-xs" required />
                  <input placeholder="NIF" value={merchantNif} onChange={e => setMerchantNif(e.target.value)} className="p-3 border-4 border-black font-black text-xs" required />
                  <input placeholder="% CASHBACK" type="number" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} className="p-3 border-4 border-black font-black text-xs" required />
                  <button className="bg-black text-white font-black uppercase text-xs border-b-4 border-vplus-green">Criar Loja</button>
                </form>
              </div>

              {/* LISTA DE LOJISTAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {merchants.map(m => (
                  <div key={m.id} className="border-4 border-black p-4 bg-white" style={{ borderTop: `12px solid ${m.primaryColor}` }}>
                    <h4 className="font-black uppercase text-lg">{m.shopName}</h4>
                    <p className="text-[10px] font-bold opacity-40 italic">NIF: {m.nif}</p>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-xs font-black uppercase bg-gray-200 px-2 italic">{m.cashbackPercent}% Cashback</span>
                      <button 
                        onClick={() => toggleMerchantStatus(m.id, m.status)}
                        className={`p-2 border-2 border-black font-black uppercase text-[8px] ${m.status === 'active' ? 'bg-vplus-green' : 'bg-red-500 text-white'}`}
                      >
                        {m.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <input 
                placeholder="PROCURAR MOVIMENTO (CARTÃO, LOJA, DOC)..." 
                className="w-full p-4 border-4 border-black font-black uppercase outline-none focus:bg-vplus-green-light"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-black text-white text-[10px] font-black uppercase italic">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Loja</th>
                      <th className="p-3">Cartão</th>
                      <th className="p-3">Doc</th>
                      <th className="p-3">Operador</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-bold uppercase">
                    {transactions.filter(t => t.clientId.includes(searchQuery) || t.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) || t.docNumber?.includes(searchQuery)).map(t => (
                      <tr key={t.id} className="border-b-2 border-gray-100 hover:bg-gray-50">
                        <td className="p-3 opacity-50">{t.createdAt.toLocaleString()}</td>
                        <td className="p-3 font-black">{t.merchantName}</td>
                        <td className="p-3 font-mono text-vplus-blue">{t.clientId}</td>
                        <td className="p-3 italic">{t.docNumber}</td>
                        <td className="p-3">{t.operatorName}</td>
                        <td className={`p-3 text-right font-black ${t.type === 'earn' ? 'text-vplus-green' : 'text-red-600'}`}>
                          {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black text-white text-[10px] font-black uppercase">
                  <tr>
                    <th className="p-3">Cartão</th>
                    <th className="p-3">Nome</th>
                    <th className="p-3">NIF</th>
                    <th className="p-3">Contacto</th>
                    <th className="p-3">C. Postal</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] font-bold uppercase">
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-gray-200">
                      <td className="p-3 font-mono font-black">{c.cardNumber}</td>
                      <td className="p-3">{c.name}</td>
                      <td className="p-3">{c.nif}</td>
                      <td className="p-3">{c.phone}</td>
                      <td className="p-3">{c.zipCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;