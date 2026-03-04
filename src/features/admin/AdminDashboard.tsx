// src/features/admin/AdminDashboard.tsx
import React from 'react';

const AdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-vplus-blue text-white p-6 flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Admin: Filipe Rocha</h1>
          <p className="text-vplus-green-light text-sm">Gestão Central Vizinho+</p>
        </div>
        <div className="text-right">
          <span className="bg-vplus-green text-vplus-blue px-3 py-1 rounded text-xs font-bold uppercase">Sistema Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 shadow-md border-t-4 border-vplus-blue">
          <h3 className="font-bold mb-4">Últimos Comerciantes Registados</h3>
          <p className="text-gray-400 italic">Nenhum comerciante ativo.</p>
        </div>
        
        <div className="bg-white p-6 shadow-md border-t-4 border-vplus-green">
          <h3 className="font-bold mb-4">Auditoria de Transações</h3>
          <p className="text-gray-400 italic">Nenhuma transação pendente.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;