// src/features/merchant/components/MerchantOperators.tsx

import React, { useState } from 'react';
import { User as UserProfile, MerchantOperator } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { 
  Users, UserPlus, KeyRound, ShieldCheck, Trash2, 
  PauseCircle, PlayCircle, CheckCircle2, AlertTriangle, Eye, EyeOff, Edit3, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MerchantOperatorsProps {
  currentUser: UserProfile;
}

const MerchantOperators: React.FC<MerchantOperatorsProps> = ({ currentUser }) => {
  const operators = currentUser.operators || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const [operatorPin, setOperatorPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Alterar PIN modal
  const [editingOperator, setEditingOperator] = useState<MerchantOperator | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const validatePasswordFormat = (val: string) => {
    return val.trim().length >= 4;
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = operatorName.trim();
    const cleanPin = operatorPin.trim();

    if (!cleanName) return toast.error("Introduza o nome do operador.");
    if (!validatePasswordFormat(cleanPin)) {
      return toast.error("A password/PIN deve ter pelo menos 4 caracteres ou dígitos.");
    }
    if (cleanPin !== confirmPin.trim()) {
      return toast.error("As passwords/PINs introduzidos não coincidem.");
    }

    // Verificar se o PIN/Password já está atribuído a outro operador ativo nesta loja
    const pinConflict = operators.some(op => (op.pin === cleanPin || op.password === cleanPin));
    if (pinConflict) {
      return toast.error("Esta password/PIN já se encontra atribuída a outro operador. Escolha uma única.");
    }

    setIsSaving(true);
    try {
      const newOperator: MerchantOperator = {
        id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        pin: cleanPin,
        password: cleanPin,
        active: true,
        createdAt: new Date().toISOString()
      };

      const updatedList = [...operators, newOperator];
      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, { operators: updatedList });

      toast.success(`Operador "${cleanName}" criado com sucesso!`);
      setOperatorName('');
      setOperatorPin('');
      setConfirmPin('');
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gravar operador.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (opId: string) => {
    try {
      const updatedList = operators.map(op => {
        if (op.id === opId) return { ...op, active: !op.active };
        return op;
      });
      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, { operators: updatedList });
      toast.success("Estado do operador atualizado!");
    } catch (err) {
      toast.error("Erro ao atualizar estado.");
    }
  };

  const handleDeleteOperator = async (opId: string, name: string) => {
    if (!window.confirm(`Tem a certeza que deseja eliminar o operador "${name}"?`)) return;
    try {
      const updatedList = operators.filter(op => op.id !== opId);
      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, { operators: updatedList });
      toast.success(`Operador "${name}" eliminado.`);
    } catch (err) {
      toast.error("Erro ao eliminar operador.");
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperator) return;

    const cleanPin = newPin.trim();
    if (!validatePasswordFormat(cleanPin)) {
      return toast.error("A nova password/PIN deve ter pelo menos 4 caracteres ou dígitos.");
    }
    if (cleanPin !== confirmNewPin.trim()) {
      return toast.error("A confirmação da password/PIN não coincide.");
    }

    const pinConflict = operators.some(op => op.id !== editingOperator.id && (op.pin === cleanPin || op.password === cleanPin));
    if (pinConflict) {
      return toast.error("Esta password/PIN já se encontra atribuída a outro operador.");
    }

    setIsSaving(true);
    try {
      const updatedList = operators.map(op => {
        if (op.id === editingOperator.id) return { ...op, pin: cleanPin, password: cleanPin };
        return op;
      });
      const merchantRef = doc(db, 'users', currentUser.id);
      await updateDoc(merchantRef, { operators: updatedList });

      toast.success(`Password/PIN de "${editingOperator.name}" alterado com sucesso!`);
      setEditingOperator(null);
      setNewPin('');
      setConfirmNewPin('');
    } catch (err) {
      toast.error("Erro ao atualizar password.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-16">
      
      {/* CABEÇALHO DA SECÇÃO */}
      <div className="bg-white p-8 md:p-10 rounded-[40px] border-4 border-[#0a2540] shadow-[12px_12px_0px_#0a2540] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#0a2540] p-3 rounded-2xl text-[#00d66f]">
              <Users size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-[#0a2540] leading-none">
                Gestão de Utilizadores / Operadores
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Controlo de multi-terminais e segurança por PIN (4 a 6 dígitos)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#00d66f] text-[#0a2540] px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-wider border-2 border-[#0a2540] shadow-[4px_4px_0px_#0a2540] hover:scale-105 active:translate-y-1 transition-all flex items-center gap-2"
        >
          <UserPlus size={18} /> Novo Operador
        </button>
      </div>

      {/* BANNER INFORMATIVO MULTI-TERMINAIS */}
      <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-[30px] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-4 items-start">
          <ShieldCheck size={28} className="text-blue-600 shrink-0 mt-1" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
              Como funciona o Multi-Terminal com Operadores?
            </h4>
            <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
              Pode manter a sua conta aberta em múltiplos telemóveis, tablets ou computadores em simultâneo. 
              Sempre que um funcionário finaliza uma atribuição ou desconto de cashback, o sistema pede o seu PIN pessoal de 4 a 6 dígitos e grava o seu nome na transação.
            </p>
          </div>
        </div>
      </div>

      {/* LISTA DE OPERADORES */}
      <div className="bg-white rounded-[40px] border-4 border-slate-100 p-8 md:p-10 shadow-lg space-y-6">
        <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
          <h3 className="text-lg font-black uppercase text-[#0a2540] flex items-center gap-2">
            Operadores Registados ({operators.length})
          </h3>
          <span className="text-[9px] font-bold text-slate-400 uppercase">
            {operators.filter(o => o.active).length} ativos
          </span>
        </div>

        {operators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map((op) => (
              <div 
                key={op.id} 
                className={`p-6 rounded-[30px] border-4 transition-all flex flex-col justify-between gap-4 ${
                  op.active 
                    ? 'bg-white border-[#0a2540] shadow-[6px_6px_0px_#0a2540]' 
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-base font-black uppercase text-[#0a2540] tracking-tight truncate">
                      {op.name}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase ${
                      op.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {op.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 font-mono text-xs font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <KeyRound size={14} className="text-[#00d66f]" />
                    <span>PIN: •••• ({op.pin?.length || 4} dígitos)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(op.id)}
                      className={`p-2 rounded-xl text-xs font-black transition-colors ${
                        op.active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={op.active ? "Pausar operador" : "Ativar operador"}
                    >
                      {op.active ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingOperator(op);
                        setNewPin('');
                        setConfirmNewPin('');
                      }}
                      className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Alterar PIN"
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteOperator(op.id, op.name)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Eliminar operador"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-[35px] border-4 border-dashed border-slate-200 p-8 space-y-3">
            <Users size={40} className="mx-auto text-slate-300" />
            <h4 className="text-sm font-black uppercase text-slate-500">Nenhum Operador Criado</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-md mx-auto">
              Crie operadores com PIN para que os funcionários possam registar transações no terminal de caixa com o seu próprio código.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 bg-[#0a2540] text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider hover:bg-black transition-colors"
            >
              + Criar Primeiro Operador
            </button>
          </div>
        )}
      </div>

      {/* MODAL: CRIAR NOVO OPERADOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-[#00d66f] shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase italic tracking-tighter text-lg flex items-center gap-2">
                <UserPlus size={22} className="text-[#00d66f]" /> Adicionar Operador de Caixa
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOperator} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Nome do Operador / Funcionário
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: João Ferreira ou Caixa 1"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-[#00d66f] font-bold text-sm text-[#0a2540] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Password / PIN de Acesso (mínimo 4 caracteres ou dígitos)
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPin ? "text" : "password"}
                    placeholder="Ex: 1234 ou senha123"
                    value={operatorPin}
                    onChange={(e) => setOperatorPin(e.target.value)}
                    className="w-full p-4 pr-12 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-[#00d66f] font-black text-lg tracking-widest text-[#0a2540] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Números ou letras (mínimo 4 caracteres)</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Confirmar Password / PIN
                </label>
                <input
                  required
                  type={showPin ? "text" : "password"}
                  placeholder="Repetir password / PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-[#00d66f] font-black text-lg tracking-widest text-[#0a2540] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs text-[#0a2540] bg-[#00d66f] hover:bg-[#00c263] border-b-4 border-black/10 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? "A Gravar..." : "Criar Operador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR PIN */}
      {editingOperator && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-[#0a2540]/90 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] border-4 border-blue-500 shadow-2xl overflow-hidden animate-in zoom-in">
            <div className="bg-[#0a2540] p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase italic tracking-tighter text-lg flex items-center gap-2">
                  <KeyRound size={22} className="text-blue-400" /> Alterar PIN
                </h3>
                <p className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">Operador: {editingOperator.name}</p>
              </div>
              <button 
                onClick={() => setEditingOperator(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePin} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Nova Password / PIN (mínimo 4 caracteres ou dígitos)
                </label>
                <input
                  required
                  type="password"
                  placeholder="Nova password ou PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 font-black text-lg tracking-widest text-[#0a2540] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">
                  Confirmar Nova Password / PIN
                </label>
                <input
                  required
                  type="password"
                  placeholder="Repetir nova password ou PIN"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 font-black text-lg tracking-widest text-[#0a2540] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingOperator(null)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-2xl font-black uppercase text-xs text-white bg-blue-600 hover:bg-blue-700 border-b-4 border-blue-900 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? "A Gravar..." : "Gravar Novo PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MerchantOperators;
