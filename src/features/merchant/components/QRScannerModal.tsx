import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, AlertTriangle } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, showTorchButtonIfSupported: true },
          false
        );

        scanner.render(
          (decodedText) => {
            if (scanner) {
                scanner.clear().catch(e => console.warn(e));
                scanner = null;
            }
            onScan(decodedText);
          },
          (err) => {}
        );
      } catch (err: any) {
        setError("Não foi possível iniciar a câmara. Verifica as permissões.");
      }
    }, 100);

    // X9 - RESOLVIDO: Limpeza de memória garantida no desmontar.
    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(e => console.warn("Erro ao limpar câmara", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[200] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-6 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f] shadow-2xl">
        <button onClick={onClose} className="absolute -top-5 -right-5 bg-red-500 text-white p-3 rounded-full border-4 border-[#0f172a] shadow-lg hover:scale-110 transition-transform">
            <X size={24} strokeWidth={3} />
        </button>
        <div className="text-center mb-4">
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] flex items-center justify-center gap-2">
                <Camera className="text-[#00d66f]" size={24} /> Ler Cartão
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aponte a câmara para o QR Code do Cliente</p>
        </div>
        {error ? (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center text-red-600 flex flex-col items-center gap-3">
                <AlertTriangle size={32} />
                <p className="text-xs font-bold uppercase">{error}</p>
            </div>
        ) : (
            <div id="reader" className="w-full overflow-hidden rounded-3xl border-2 border-slate-100 bg-slate-50 min-h-[300px]"></div>
        )}
      </div>
    </div>
  );
};

export default QRScannerModal;