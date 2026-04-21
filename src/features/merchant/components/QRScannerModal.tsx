import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { X, Camera, AlertTriangle } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);

  // Correção: Adicionado tipo (result: any)
  const handleScan = (result: any) => {
    if (result && result.length > 0 && result[0].rawValue) {
      onScan(result[0].rawValue);
    }
  };

  // Correção: Adicionado tipo (err: any)
  const handleError = (err: any) => {
    console.error("Erro da Câmara:", err);
    if (err?.message?.includes('No MultiFormat Readers')) return;
    setError("Ocorreu um erro ao aceder à câmara. Por favor, verifique as permissões.");
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[200] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-6 md:p-10 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f] shadow-2xl animate-in zoom-in">
        
        <button 
            onClick={onClose} 
            className="absolute -top-5 -right-5 bg-red-500 text-white p-3 rounded-full border-4 border-[#0f172a] shadow-lg hover:scale-110 transition-transform z-50"
        >
            <X size={24} strokeWidth={3} />
        </button>

        <div className="text-center mb-6">
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] flex items-center justify-center gap-2">
                <Camera className="text-[#00d66f]" size={24} /> Ler Cartão
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aponte a câmara para o QR Code do Cliente</p>
        </div>

        {error ? (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center text-red-600 flex flex-col items-center gap-3">
                <AlertTriangle size={32} />
                <p className="text-xs font-bold uppercase">{error}</p>
                <button onClick={onClose} className="mt-4 bg-red-500 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase">Fechar</button>
            </div>
        ) : (
            <div className="w-full overflow-hidden rounded-3xl border-4 border-slate-100 bg-black relative shadow-inner">
               <Scanner 
                 onScan={handleScan}
                 onError={handleError}
                 components={{
                   torch: true,
                   zoom: true,
                   finder: true
                 }}
                 styles={{
                   container: { width: '100%', paddingTop: '100%' },
                   video: { objectFit: 'cover' }
                 }}
               />
            </div>
        )}

      </div>
    </div>
  );
};

export default QRScannerModal;