// src/features/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminDashboard: React.FC = () => {
  const { transactions } = useStore();
  const [merchants, setMerchants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [shopName, setShopName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [merchantNif, setMerchantNif] = useState('');

  // Carregar Lojistas e Logs de Auditoria
  useEffect(() => {
    const qMerchants = query(collection(db, 'merchants'), orderBy('createdAt', 'desc'));
    const qLogs = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(10));

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
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono text-vplus-blue">
      {/* HEADER BRUTALISTA */}
      <header className="bg-vplus-blue text-white p-6 border-b-8 border-black shadow-[0_4px_0_0_rgba(0,0,0,1)]">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Admin Command Center</h1>
            <p className="text-vplus-green text-xs font-bold mt-2 uppercase tracking-widest">Filipe Rocha | Sessão Segura</p>
          </div>
          <button onClick={() => window.location.href='/login'} className="bg-red-500 border-2 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ALERTAS DE SEGURANÇA - NOVO! */}
        <section className="lg:col-span-12">
          <div className="bg-black text-white p-4 border-l-8 border-red-500 flex items-center gap-4">
            <span className="animate-pulse text-red-500 text-2xl">⚠️</span>
            <div>
              <h2 className="font-black uppercase text-sm">Monitorização de Fraude Ativa</h2>
              <p className="text-[10px] opacity-70 uppercase">O sistema está a analisar redenções em tempo real.</p>
            </div>
          </div>
        </section>

        {/* COLUNA ESQUERDA: CADASTRO */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-6 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black uppercase mb-4 border-b-4 border-vplus-blue pb-2 italic">Novo Lojista</h3>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="NOME DA LOJA" className="w-full border-4 border-black p-3 font-black uppercase outline-none focus:bg-vplus-green-light" />
              <input value={merchantEmail} onChange={e => setMerchantEmail(e.target.value)} placeholder="EMAIL" className="w-full border-4 border-black p-3 font-black outline-none focus:bg-vplus-green-light" />
              <button className="w-full bg-vplus-blue text-white p-4 font-black uppercase border-b-4 border-black active:border-b-0 hover:bg-vplus-green hover:text-vplus-blue transition-all">Registar Parceiro</button>
            </form>
          </div>

          {/* LISTA DE LOJISTAS */}
          <div className="bg-white border-4 border-black p-4">
            <h3 className="font-black uppercase text-xs mb-4 opacity-50 italic">Rede de Parceiros</h3>
            <div className="space-y-2">
              {merchants.map((m: any) => (
                <div key={m.id} className="p-3 bg-gray-100 border-2 border-black flex justify-between items-center">
                  <span className="font-black text-[10px] uppercase truncate w-32">{m.shopName}</span>
                  <span className="text-[8px] bg-vplus-green px-2 py-1 font-black">ONLINE</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* COLUNA DIREITA: LOGS E AUDITORIA */}
        <section className="lg:col-span-8 space-y-8">
          {/* TABELA DE AUDITORIA */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-vplus-blue text-white p-4 font-black uppercase italic tracking-widest flex justify-between">
              <span>Audit Trail (Firebase Cloud)</span>
              <span className="text-vplus-green">Live</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b-4 border-black font-black uppercase">
                    <th className="p-4">Evento</th>
                    <th className="p-4">Loja</th>
                    <th className="p-4">Cartão</th>
                    <th className="p-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-200">
                  {auditLogs.map((log: any) => (
                    <tr key={log.id} className={log.severity === 'HIGH' ? 'bg-red-50 text-red-600 font-bold' : ''}>
                      <td className="p-4 italic font-black text-[10px] uppercase">{log.message}</td>
                      <td className="p-4 uppercase font-bold text-vplus-blue">{log.merchantId.slice(0,5)}...</td>
                      <td className="p-4 font-mono">{log.clientId}</td>
                      <td className="p-4 text-right font-black text-lg">{log.amount.toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default AdminDashboard;