import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        // Limpeza imediata após sucesso
        scanner.clear().catch(console.error);
      },
      (error) => { /* Ignorar erros de leitura contínua */ }
    );

    return () => {
      // GARANTIA DE LIMPEZA AO DESMONTAR
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => console.warn("Erro ao fechar câmara:", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[200] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-6 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f]">
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full border-4 border-[#0f172a] z-50">
          <X size={24} />
        </button>
        <div id="reader" className="w-full overflow-hidden rounded-3xl"></div>
      </div>
      <p className="mt-6 text-white/50 font-black uppercase text-[10px] tracking-widest italic">Aponte para o Cartão do Cliente</p>
    </div>
  );
};

export default QRScannerModal;