// src/components/ImageCropperModal.tsx

import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

interface Props {
  file: File;
  onCrop: (base64: string) => void;
  onCancel: () => void;
}

const ImageCropperModal: React.FC<Props> = ({ file, onCrop, onCancel }) => {
  const [src, setSrc] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handlePointerDown = (e: any) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handlePointerUp = () => setIsDragging(false);

  const handleSave = async () => {
    if (!containerRef.current) return;
    setIsSaving(true);
    toast.loading('A recortar imagem...', { id: 'crop' });
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      onCrop(canvas.toDataURL('image/jpeg', 0.8));
      toast.success('Imagem cortada com sucesso!', { id: 'crop' });
    } catch (e) {
      toast.error('Erro ao processar imagem.', { id: 'crop' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-[#0a2540]/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl flex flex-col border-4 border-[#00d66f] animate-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black uppercase italic tracking-tighter text-[#0a2540] flex items-center gap-2"><Move className="text-[#00d66f]" size={20}/> Ajustar Banner</h3>
          <button onClick={onCancel} className="hover:text-red-500 transition-colors"><X /></button>
        </div>
        
        <p className="text-[10px] font-bold text-slate-500 mb-6 leading-relaxed">Arraste a imagem para centrar e use a barra para fazer zoom. <strong className="text-[#0a2540]">O que estiver dentro do quadro abaixo será o seu banner final.</strong></p>

        {/* Simulador de 16:9 */}
        <div className="bg-slate-100 p-2 rounded-2xl border-4 border-dashed border-slate-200 mb-6">
            <div 
            ref={containerRef}
            className="w-full aspect-video relative overflow-hidden rounded-xl cursor-move touch-none bg-black"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            >
            <img 
                src={src} 
                alt="Crop" 
                draggable={false}
                style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transformOrigin: 'center center',
                minWidth: '100%',
                minHeight: '100%',
                objectFit: 'cover'
                }}
            />
            </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
          <ZoomOut size={20} className="text-slate-400" />
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-[#00d66f]" />
          <ZoomIn size={20} className="text-slate-400" />
        </div>

        <button disabled={isSaving} onClick={handleSave} className="w-full mt-6 bg-[#00d66f] text-[#0a2540] p-5 rounded-2xl font-black uppercase shadow-lg hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 border-b-4 border-black/10 disabled:opacity-50">
          <CheckCircle2 size={20} /> Confirmar Corte
        </button>
      </div>
    </div>
  );
}

export default ImageCropperModal;