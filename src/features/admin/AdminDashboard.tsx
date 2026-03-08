// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const { transactions, subscribeToTransactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'transactions' | 'merchants' | 'clients'>('transactions');
  const [isLoading, setIsLoading] = useState(false);
  
  // ESTADOS DO FORMULÁRIO DE CRIAÇÃO
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');
  const [cashbackPercent, setCashbackPercent] = useState('10');
  const [merchantColor, setMerchantColor] = useState('#0a2540');

  // ESTADO DE PESQUISA E FILTROS
  const [searchQuery, setSearchQuery] = useState('');

  // Escuta global de todas as transações (Modo Admin)
  useEffect(() => {
    const unsubscribe = subscribeToTransactions('admin');
    return () => unsubscribe();
  }, [subscribeToTransactions]);

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
    setIsLoading(true);
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
      alert(`Lojista ${shopName} registado com sucesso no ecossistema.`);
      setShopName(''); setMerchantEmail(''); setMerchantNif('');
    } catch (error) {
      alert("Erro ao criar lojista.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMerchantStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await updateDoc(doc(db, 'merchants', id), { status: newStatus });
  };

  const exportAuditoria = () => {
    const data = transactions.map(t => ({
      'Data/Hora': t.createdAt.toLocaleString(),
      'Estabelecimento': t.merchantName,
      'Cartão Cliente': t.clientId,
      'Operação': t.type === 'earn' ? 'Crédito' : 'Débito',
      'Valor Venda': t.amount + '€',
      'Cashback Movimentado': t.cashbackAmount.toFixed(2) + '€',
      'Nº Documento': t.docNumber,
      'Operador': t.operatorName
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria_VPlus");
    XLSX.writeFile(wb, `Relatorio_Global_VPlus_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const filteredTransactions = transactions.filter(t => 
    t.clientId.includes(searchQuery) || 
    t.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.docNumber?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#f6f9fc] font-sans pb-10">
      {/* HEADER DE ADMIN */}
      <header className="bg-[#0a2540] text-white p-8 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-[#00d66f] rounded-full animate-pulse"></div>
              <h1 className="text-2xl font-bold tracking-tight uppercase">Vizinho+ Admin Control</h1>
            </div>
            <p className="text-slate-400 text-xs font-medium">Sessão Ativa: <span className="text-white">rochap.filipe@gmail.com</span></p>
          </div>
          <button 
            onClick={exportAuditoria} 
            className="bg-[#00d66f] text-[#0a2540] px-8 py-3 rounded-xl font-bold hover:bg-white transition-all shadow-lg flex items-center gap-2"
          >
            <span>📊</span> Exportar Relatório Excel
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10 -mt-6">
        {/* NAVEGAÇÃO POR ABAS */}
        <nav className="flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 max-w-fit">
          <button onClick={() => setActiveTab('transactions')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'transactions' ? 'bg-[#0a2540] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Audit Log Global</button>
          <button onClick={() => setActiveTab('merchants')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'merchants' ? 'bg-[#0a2540] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Gestão de Lojistas</button>
          <button onClick={() => setActiveTab('clients')} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'clients' ? 'bg-[#0a2540] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Base de Vizinhos</button>
        </nav>

        {/* ÁREA DE TRANSAÇÕES */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <input 
                placeholder="Filtrar por Cartão, Loja ou Documento..." 
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f] transition-all text-sm font-medium shadow-sm"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-5">Data/Hora</th>
                    <th className="p-5">Loja</th>
                    <th className="p-5">Cartão Cliente</th>
                    <th className="p-5">Doc. Origem</th>
                    <th className="p-5">Operador</th>
                    <th className="p-5 text-right">Cashback</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="p-5 text-slate-400 font-medium">{t.createdAt.toLocaleString()}</td>
                      <td className="p-5 font-bold text-[#0a2540]">{t.merchantName}</td>
                      <td className="p-5 font-mono font-bold text-blue-600 bg-blue-50/30">{t.clientId}</td>
                      <td className="p-5 text-slate-500 font-medium">{t.docNumber || '---'}</td>
                      <td className="p-5 text-slate-500">{t.operatorName}</td>
                      <td className={`p-5 text-right font-bold ${t.type === 'earn' ? 'text-[#00d66f]' : 'text-red-500'}`}>
                        {t.type === 'earn' ? '+' : '-'}{t.cashbackAmount.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-medium">Nenhum movimento encontrado com estes critérios.</div>
              )}
            </div>
          </div>
        )}

        {/* ÁREA DE LOJISTAS */}
        {activeTab === 'merchants' && (
          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-[#0a2540] mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-[#00d66f]/20 text-[#00d66f] rounded-lg flex items-center justify-center text-sm">✚</span>
                Registar Novo Comerciante
              </h3>
              <form onSubmit={handleAddMerchant} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input placeholder="Nome da Loja" value={shopName} onChange={e => setShopName(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
                <input placeholder="Email Admin Loja" type="email" value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
                <input placeholder="NIF da Empresa" value={merchantNif} onChange={e => setMerchantNif(e.target.value)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
                <div className="flex gap-2">
                  <input placeholder="% Cashback" type="number" value={cashbackPercent} onChange={e => setCashbackPercent(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#00d66f]" required />
                  <button className="bg-[#0a2540] text-white px-6 rounded-2xl font-bold hover:bg-[#153455] transition-all">
                    {isLoading ? '...' : 'Criar'}
                  </button>
                </div>
              </form>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {merchants.map(m => (
                <div key={m.id} className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: m.primaryColor }}></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-[#0a2540] text-lg uppercase leading-tight">{m.shopName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">NIF: {m.nif}</p>
                    </div>
                    <span className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-black text-[#0a2540] border border-slate-100">{m.cashbackPercent}% CB</span>
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-50">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${m.status === 'active' ? 'bg-[#00d66f]/10 text-[#00d66f]' : 'bg-red-50 text-red-500'}`}>
                      {m.status === 'active' ? '● Ativa' : '● Suspensa'}
                    </span>
                    <button 
                      onClick={() => toggleMerchantStatus(m.id, m.status)}
                      className={`text-[10px] font-bold px-4 py-2 rounded-xl transition-all ${m.status === 'active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-[#00d66f] text-[#0a2540]'}`}
                    >
                      {m.status === 'active' ? 'Desativar' : 'Ativar Loja'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA DE CLIENTES */}
        {activeTab === 'clients' && (
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="p-5">Cartão</th>
                    <th className="p-5">Nome</th>
                    <th className="p-5">NIF / CP</th>
                    <th className="p-5">Email / Contacto</th>
                    <th className="p-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {clients.map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="p-5 font-mono font-bold text-[#0a2540]">{c.cardNumber}</td>
                      <td className="p-5 font-bold text-slate-700">{c.name}</td>
                      <td className="p-5">
                        <div className="text-slate-600 font-medium">{c.nif}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{c.zipCode}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-slate-600 font-medium">{c.email}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{c.phone || 'Sem contacto'}</div>
                      </td>
                      <td className="p-5 text-center">
                        <span className="bg-[#00d66f]/10 text-[#00d66f] px-3 py-1 rounded-full text-[10px] font-bold uppercase">Ativo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;