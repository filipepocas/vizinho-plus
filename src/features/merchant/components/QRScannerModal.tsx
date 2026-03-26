import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, RefreshCcw, Camera } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    // Inicializa o scanner com a câmara traseira por defeito
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 280, height: 280 },
        // IMPORTANTE: Tenta a traseira primeiro
        aspectRatio: 1.0 
      },
      false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      () => {}
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.warn(e));
      }
    };
  }, [onScan, facingMode]);

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[200] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-6 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f]">
        
        {/* BOTÕES DE CONTROLO */}
        <div className="absolute -top-4 -right-4 flex gap-2 z-50">
            <button onClick={() => setFacingMode(prev => prev === "user" ? "environment" : "user")} className="bg-blue-500 text-white p-3 rounded-full border-4 border-[#0f172a] shadow-lg">
                <RefreshCcw size={20} />
            </button>
            <button onClick={onClose} className="bg-red-500 text-white p-3 rounded-full border-4 border-[#0f172a] shadow-lg">
                <X size={20} />
            </button>
        </div>

        <div id="reader" className="w-full overflow-hidden rounded-3xl"></div>
        
        <div className="mt-4 flex items-center justify-center gap-3 text-[#0a2540]">
            <Camera size={18} />
            <p className="font-black text-[10px] uppercase tracking-widest">
                Câmara: {facingMode === "environment" ? "TRASEIRA (DEFEITO)" : "FRONTAL (SELFIE)"}
            </p>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;