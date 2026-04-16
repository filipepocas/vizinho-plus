import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertTriangle, RefreshCcw, Play, CheckCircle } from 'lucide-react';

interface QRScannerModalProps {
  onScan: (text: string) => void;
  onClose: () => void;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Inicializa a classe base (sem a UI predefinida deles)
    scannerRef.current = new Html5Qrcode("qr-reader-custom");

    return () => {
      // Limpeza de memória garantida ao fechar a janela
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.warn);
      }
    };
  }, []);

  const handleRequestPermission = async () => {
    try {
      const cameras = await Html5Qrcode.getCameras();
      if (cameras && cameras.length > 0) {
        setHasPermission(true);
        setError(null);
      } else {
        setError("Nenhuma câmara detetada no dispositivo.");
      }
    } catch (err) {
      setError("A permissão para usar a câmara foi recusada. Ative-a nas definições do seu navegador.");
    }
  };

  const startScanner = async (mode = facingMode) => {
    if (!scannerRef.current) return;
    
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: mode }, // Por defeito é "environment" (traseira)
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch(console.warn);
          }
          onScan(decodedText);
        },
        (errorMessage) => { /* Ignorar erros de frames em branco */ }
      );
      setIsScanning(true);
      setError(null);
    } catch (err) {
      setError("Erro ao iniciar a câmara. Tente clicar em Mudar Câmara.");
      setIsScanning(false);
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startScanner(newMode);
  };

  const handleClose = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => onClose()).catch(() => onClose());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl z-[200] p-6 flex flex-col items-center justify-center">
      <div className="bg-white p-6 md:p-10 rounded-[40px] w-full max-w-lg relative border-4 border-[#00d66f] shadow-2xl animate-in zoom-in">
        
        <button 
            onClick={handleClose} 
            className="absolute -top-5 -right-5 bg-red-500 text-white p-3 rounded-full border-4 border-[#0f172a] shadow-lg hover:scale-110 transition-transform"
        >
            <X size={24} strokeWidth={3} />
        </button>

        <div className="text-center mb-6">
            <h3 className="text-xl font-black uppercase italic text-[#0a2540] flex items-center justify-center gap-2">
                <Camera className="text-[#00d66f]" size={24} /> Ler Cartão
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aponte a câmara para o QR Code do Cliente</p>
        </div>

        {error && (
            <div className="bg-red-50 border-2 border-red-200 p-4 rounded-3xl text-center text-red-600 flex flex-col items-center gap-2 mb-4">
                <AlertTriangle size={24} />
                <p className="text-xs font-bold uppercase">{error}</p>
            </div>
        )}

        {/* Ecrã de Leitura */}
        <div id="qr-reader-custom" className="w-full overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-100 min-h-[300px] flex items-center justify-center shadow-inner">
          {!isScanning && (
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Câmara Inativa</p>
          )}
        </div>

        {/* Controlos Manuais */}
        <div className="mt-6 flex flex-col gap-3">
           {!hasPermission ? (
             <button onClick={handleRequestPermission} className="w-full bg-[#0a2540] text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                <CheckCircle size={18} className="text-[#00d66f]" /> 1. Permitir Acesso à Câmara
             </button>
           ) : !isScanning ? (
             <button onClick={() => startScanner(facingMode)} className="w-full bg-[#00d66f] text-[#0a2540] p-4 rounded-2xl font-black uppercase text-xs shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 border-b-4 border-black/20">
                <Play size={18} /> 2. Iniciar Leitura do Cartão
             </button>
           ) : (
             <button onClick={toggleCamera} className="w-full bg-slate-100 text-slate-500 hover:text-[#0a2540] p-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-colors border-2 border-slate-200 hover:border-[#0a2540]">
                <RefreshCcw size={16} /> Mudar Câmara (Frontal / Traseira)
             </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default QRScannerModal;